import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileText, Plus, Pencil, Search, X, Upload, Download, FileSpreadsheet, Trash2 } from 'lucide-react';
import { clientesApi, contratosApi, planesApi, puntosRedApi, productosApi, tecnicosApi } from '../services/api';
import { Btn, Badge, Modal, Table, Tr, Td } from '../components/ui';
import ContratoDrawer from '../components/ContratoDrawer';
import { tipoLabel } from '../utils/tiposOrden';
import { useAuthStore } from '../store/auth.store';

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Plantilla de Excel para importar/exportar contratos ──────────
const COLUMNAS_PLANTILLA = [
  'Contrato', 'Doc Identidad', 'Abonado', 'Direccion', 'Referencia', 'Sector',
  'Tipo de servicio', 'nombre del plan', 'dia de corte', 'telefono', 'Cintillo', 'Punto de red',
  'IP WAN', 'Mascara', 'Gateway', 'Usuario PPPoE', 'Contraseña PPPoE',
];
const ANCHOS_PLANTILLA = [14, 14, 28, 24, 20, 14, 16, 20, 12, 14, 14, 14, 16, 16, 16, 20, 20];

function descargarPlantilla() {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.aoa_to_sheet([COLUMNAS_PLANTILLA]);
    ws['!cols'] = ANCHOS_PLANTILLA.map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    XLSX.writeFile(wb, 'plantilla_contratos.xlsx');
  });
}

function exportarContratosExcel(contratos) {
  import('xlsx').then(XLSX => {
    const encabezados = [...COLUMNAS_PLANTILLA, 'Meses pendientes', 'Deuda (S/)'];
    const rows = contratos.map(c => ([
      c.numero,
      c.cliente?.dniRuc?.startsWith('SINDOC-') ? '' : (c.cliente?.dniRuc || ''),
      `${c.cliente?.nombres || ''} ${c.cliente?.apellidos || ''}`.trim(),
      c.direccion || '',
      c.referencia || '',
      c.sector || '',
      c.tipoServicio || '',
      c.plan?.nombre || '',
      c.diaCorte || '',
      c.cliente?.telefono || '',
      c.precinto || '',
      c.puntoRed?.codigo || '',
      c.ipWan || '',
      c.mascara || '',
      c.gateway || '',
      c.pppoeUsuario || '',
      c.pppoePassword || '',
      c.mesesPendientes || 0,
      Number(c.deudaPendiente || 0),
    ]));
    const ws = XLSX.utils.aoa_to_sheet([encabezados, ...rows]);
    ws['!cols'] = [...ANCHOS_PLANTILLA, 16, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    XLSX.writeFile(wb, `contratos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
}

const CLAVE_POR_ENCABEZADO = {
  'contrato': 'contrato',
  'doc identidad': 'docIdentidad',
  'abonado': 'abonado',
  'direccion': 'direccion',
  'dirección': 'direccion',
  'referencia': 'referencia',
  'sector': 'sector',
  'tipo de servicio': 'tipoServicio',
  'nombre del plan': 'nombrePlan',
  'dia de corte': 'diaCorte',
  'día de corte': 'diaCorte',
  'telefono': 'telefono',
  'teléfono': 'telefono',
  'cintillo': 'cintillo',
  'punto de red': 'puntoRed',
  'ip wan': 'ipWan',
  'mascara': 'mascara',
  'máscara': 'mascara',
  'gateway': 'gateway',
  'usuario pppoe': 'pppoeUsuario',
  'contraseña pppoe': 'pppoePassword',
  'contrasena pppoe': 'pppoePassword',
};

function parsearExcelContratos(file) {
  return import('xlsx').then(XLSX => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const filasCrudas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const [encabezados, ...datos] = filasCrudas;
        const claves = encabezados.map(h => CLAVE_POR_ENCABEZADO[String(h).trim().toLowerCase()] || null);
        const filas = datos
          .filter(fila => fila.some(v => String(v).trim() !== ''))
          .map(fila => {
            const obj = {};
            claves.forEach((clave, i) => { if (clave) obj[clave] = fila[i]; });
            return obj;
          });
        resolve(filas);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  }));
}

const TIPOS_SERVICIO = { INTERNET: 'Internet', CABLE: 'Cable', DUO: 'Dúo' };
const ESTADOS = {
  ACTIVO: { label: 'Activo', color: 'green' },
  SUSPENDIDO: { label: 'Suspendido', color: 'yellow' },
  CORTADO: { label: 'Cortado', color: 'red' },
  BAJA: { label: 'Baja', color: 'red' },
};

const campoInputStyle = {
  width: '100%', height: 40, padding: '0 12px', background: '#E1EBF5',
  border: '1px solid #C9DAEA', borderRadius: 8, color: '#1E3A5F',
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
};

function Campo({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{label}{required && <span> *</span>}</label>
      {children}
    </div>
  );
}

function SeccionLabel({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 8, borderBottom: '1px solid #E2ECF4', marginBottom: 2 }}>
      {children}
    </div>
  );
}

const emptyForm = {
  id: null, clienteId: '', clienteLabel: '', clienteData: null, clienteCelular: '',
  direccion: '', referencia: '', sector: '',
  tipoServicio: 'INTERNET', ipWan: '', mascara: '', gateway: '', pppoeUsuario: '', pppoePassword: '',
  latitud: '', longitud: '', precinto: '',
  planId: '', mbps: '', costoMensual: '', diaCorte: '',
  puntoRedId: '', equipoProductoId: '', equipoSerie: '',
  tecnicoInstaladorId: '', fechaInstalacion: '',
  estado: 'ACTIVO', motivoBaja: '', fechaBaja: '',
};

function FormNuevoCliente({ nombreInicial, onCreado, onCancelar }) {
  const qc = useQueryClient();
  const [datos, setDatos] = useState({ nombres: nombreInicial || '', apellidos: '', dniRuc: '', telefono: '' });

  const crearM = useMutation({
    mutationFn: () => clientesApi.crear(datos).then(r => r.data),
    onSuccess: (cliente) => {
      toast.success('Cliente creado');
      qc.invalidateQueries({ queryKey: ['clientes-buscar'] });
      onCreado(cliente);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo crear el cliente'),
  });

  const valido = datos.nombres.trim() && /^\d{8}(\d{3})?$/.test(datos.dniRuc.trim());

  return (
    <div style={{ border: '1px solid #C9DAEA', borderRadius: 8, marginTop: 6, padding: 12, background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E3A5F' }}>Crear nuevo cliente</span>
      <input value={datos.nombres} onChange={e => setDatos({ ...datos, nombres: e.target.value })} placeholder="Nombres *" style={campoInputStyle} />
      <input value={datos.apellidos} onChange={e => setDatos({ ...datos, apellidos: e.target.value })} placeholder="Apellidos" style={campoInputStyle} />
      <input value={datos.dniRuc} onChange={e => setDatos({ ...datos, dniRuc: e.target.value })} placeholder="DNI (8 dígitos) o RUC (11 dígitos) *" style={campoInputStyle} />
      <input value={datos.telefono} onChange={e => setDatos({ ...datos, telefono: e.target.value })} placeholder="Teléfono" style={campoInputStyle} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn type="button" variant="ghost" size="sm" onClick={onCancelar}>Cancelar</Btn>
        <Btn type="button" size="sm" disabled={!valido || crearM.isPending} onClick={() => crearM.mutate()}>Crear y seleccionar</Btn>
      </div>
    </div>
  );
}

function BuscadorCliente({ value, label, onSelect }) {
  const [q, setQ] = useState('');
  const [creando, setCreando] = useState(false);
  const clientesQ = useQuery({
    queryKey: ['clientes-buscar', q],
    queryFn: () => clientesApi.listar({ q: q || undefined }).then(r => r.data),
    enabled: q.trim().length > 0,
  });

  const sinResultados = q.trim() && !clientesQ.isLoading && (clientesQ.data || []).length === 0;

  return (
    <div>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 8 }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
          <button type="button" onClick={() => onSelect(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={15} /></button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 40, border: '1px solid #C9DAEA', borderRadius: 8, background: '#E1EBF5' }}>
            <Search size={15} color="#64748B" />
            <input value={q} onChange={e => { setQ(e.target.value); setCreando(false); }} placeholder="Buscar por nombre o DNI/RUC..." style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: '#1E3A5F' }} />
          </div>
          {q.trim() && (clientesQ.data || []).length > 0 && (
            <div style={{ border: '1px solid #C9DAEA', borderRadius: 8, marginTop: 6, maxHeight: 180, overflowY: 'auto', background: '#fff' }}>
              {clientesQ.data.map(c => (
                <button key={c.id} type="button" onClick={() => onSelect(c)}
                  style={{ width: '100%', border: 0, background: 'transparent', padding: '9px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', borderBottom: '1px solid #EEF2F6' }}>
                  <span><strong>{c.nombres} {c.apellidos}</strong></span>
                  <span style={{ color: '#64748B', fontSize: 12 }}>{c.dniRuc}</span>
                </button>
              ))}
            </div>
          )}
          {sinResultados && !creando && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 12px', border: '1px dashed #C9DAEA', borderRadius: 8 }}>
              <span style={{ fontSize: 12.5, color: '#64748B' }}>Sin resultados para "{q}"</span>
              <Btn type="button" size="sm" icon={<Plus size={13} />} onClick={() => setCreando(true)}>Crear cliente</Btn>
            </div>
          )}
          {creando && (
            <FormNuevoCliente
              nombreInicial={q}
              onCancelar={() => setCreando(false)}
              onCreado={(cliente) => { setCreando(false); onSelect(cliente); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function Contratos() {
  const qc = useQueryClient();
  const esAdmin = useAuthStore(s => s.usuario?.rol === 'ADMIN');
  const [modal, setModal] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [q, setQ] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [deudaFiltro, setDeudaFiltro] = useState('');
  const [planFiltro, setPlanFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 25;
  const [resultadoImport, setResultadoImport] = useState(null);
  const inputImportarRef = useRef(null);

  const contratosQ = useQuery({
    queryKey: ['contratos', q, estadoFiltro],
    queryFn: () => contratosApi.listar({ q: q || undefined, estado: estadoFiltro || undefined }).then(r => r.data),
  });

  const planesQ = useQuery({ queryKey: ['planes'], queryFn: () => planesApi.listar({ soloActivos: 'true' }).then(r => r.data) });
  const puntosQ = useQuery({ queryKey: ['puntos-red-mapa'], queryFn: () => puntosRedApi.listar().then(r => r.data) });
  const tecnicosQ = useQuery({ queryKey: ['tecnicos-select'], queryFn: () => tecnicosApi.listar().then(r => r.data) });
  const catalogoQ = useQuery({ queryKey: ['productos-catalogo-completo'], queryFn: () => productosApi.catalogo({ limit: 1000 }).then(r => r.data.data) });

  const planesFiltrados = useMemo(() => (planesQ.data || []).filter(p => !modal?.tipoServicio || p.tipoServicio === modal.tipoServicio), [planesQ.data, modal?.tipoServicio]);

  const guardarM = useMutation({
    mutationFn: async () => {
      const payload = { ...modal };
      delete payload.id;
      delete payload.clienteLabel;
      delete payload.clienteData;
      delete payload.clienteCelular;

      if (modal.clienteId && modal.clienteData && modal.clienteCelular !== (modal.clienteData.telefono || '')) {
        await clientesApi.actualizar(modal.clienteId, { ...modal.clienteData, telefono: modal.clienteCelular });
      }

      return modal.id ? contratosApi.actualizar(modal.id, payload) : contratosApi.crear(payload);
    },
    onSuccess: () => {
      toast.success(modal.id ? 'Contrato actualizado' : 'Contrato creado');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar el contrato'),
  });

  const eliminarM = useMutation({
    mutationFn: (id) => contratosApi.eliminar(id),
    onSuccess: () => {
      toast.success('Contrato eliminado');
      qc.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo eliminar el contrato'),
  });

  const eliminarContrato = (c) => {
    if (confirm(`¿Eliminar el contrato ${c.numero}? Esto borra también sus cargos, pagos vinculados y órdenes de servicio. Esta acción no se puede deshacer.`)) {
      eliminarM.mutate(c.id);
    }
  };

  const importarM = useMutation({
    mutationFn: (filas) => contratosApi.importar(filas).then(r => r.data),
    onSuccess: (data) => {
      setResultadoImport(data);
      qc.invalidateQueries({ queryKey: ['contratos'] });
      if (data.creados > 0) toast.success(`${data.creados} contrato(s) importado(s)`);
      else toast('No se importó ningún contrato nuevo', { icon: '⚠️' });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo importar el archivo'),
  });

  const manejarArchivoImportar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const filas = await parsearExcelContratos(file);
      if (filas.length === 0) { toast.error('El archivo no tiene filas para importar'); return; }
      importarM.mutate(filas);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo leer el archivo. Verifica que sea un Excel válido.');
    }
  };

  const contratos = contratosQ.data || [];

  const contratosFiltrados = useMemo(() => {
    let lista = contratos;
    if (deudaFiltro === 'aldia') lista = lista.filter(c => !(c.deudaPendiente > 0));
    else if (deudaFiltro === 'condeuda') lista = lista.filter(c => c.deudaPendiente > 0);
    else if (deudaFiltro === 'deuda1') lista = lista.filter(c => c.deudaPendiente > 0 && c.mesesPendientes === 1);
    else if (deudaFiltro === 'deuda2') lista = lista.filter(c => c.deudaPendiente > 0 && c.mesesPendientes === 2);
    else if (deudaFiltro === 'deuda3mas') lista = lista.filter(c => c.deudaPendiente > 0 && c.mesesPendientes >= 3);

    if (planFiltro === 'sinplan') lista = lista.filter(c => !c.planId);
    else if (planFiltro) lista = lista.filter(c => c.planId === planFiltro);

    return lista;
  }, [contratos, deudaFiltro, planFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(contratosFiltrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const contratosPagina = contratosFiltrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  useEffect(() => { setPagina(1); }, [q, estadoFiltro, deudaFiltro, planFiltro]);

  const abrirNuevo = () => setModal(emptyForm);
  const abrirEditar = (c) => setModal({
    id: c.id, numero: c.numero, clienteId: c.clienteId, clienteLabel: `${c.cliente?.nombres} ${c.cliente?.apellidos || ''} — ${c.cliente?.dniRuc}`,
    clienteData: c.cliente || null, clienteCelular: c.cliente?.telefono || '',
    direccion: c.direccion, referencia: c.referencia || '', sector: c.sector || '',
    tipoServicio: c.tipoServicio, ipWan: c.ipWan || '', mascara: c.mascara || '', gateway: c.gateway || '',
    pppoeUsuario: c.pppoeUsuario || '', pppoePassword: c.pppoePassword || '',
    latitud: c.latitud ?? '', longitud: c.longitud ?? '', precinto: c.precinto || '',
    planId: c.planId || '', mbps: c.mbps ?? '', costoMensual: c.costoMensual ?? '', diaCorte: c.diaCorte ?? '',
    puntoRedId: c.puntoRedId || '', equipoProductoId: c.equipoProductoId ?? '', equipoSerie: c.equipoSerie || '',
    tecnicoInstaladorId: c.tecnicoInstaladorId || '', fechaInstalacion: c.fechaInstalacion ? c.fechaInstalacion.slice(0, 10) : '',
    estado: c.estado, motivoBaja: c.motivoBaja || '', fechaBaja: c.fechaBaja ? c.fechaBaja.slice(0, 10) : '',
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const editarId = location.state?.editar;
    if (!editarId || contratos.length === 0) return;
    const encontrado = contratos.find(c => c.id === editarId);
    if (encontrado) abrirEditar(encontrado);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratos, location.state]);

  const requiereIp = modal?.tipoServicio === 'INTERNET' || modal?.tipoServicio === 'DUO';
  const requiereBaja = modal?.estado === 'BAJA' || modal?.estado === 'CORTADO';
  const diaCorteValido = Number.isInteger(Number(modal?.diaCorte)) && Number(modal?.diaCorte) >= 1 && Number(modal?.diaCorte) <= 31;
  const formValido = modal?.clienteId && modal?.direccion?.trim() && modal?.tipoServicio && diaCorteValido;

  const seleccionarPlan = (planId) => {
    const plan = (planesQ.data || []).find(p => p.id === planId);
    setModal(m => ({ ...m, planId, mbps: plan?.mbps ?? m.mbps, costoMensual: plan?.precio ?? m.costoMensual }));
  };

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <FileText size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Contratos</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Contratos de Internet, Cable y Dúo</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="ghost" icon={<Download size={14} />} onClick={descargarPlantilla}>Plantilla</Btn>
          <Btn variant="ghost" icon={<FileSpreadsheet size={14} />} disabled={contratosFiltrados.length === 0} onClick={() => exportarContratosExcel(contratosFiltrados)}>Exportar</Btn>
          <Btn variant="ghost" icon={<Upload size={14} />} disabled={importarM.isPending} loading={importarM.isPending} onClick={() => inputImportarRef.current?.click()}>
            Importar Excel
          </Btn>
          <input ref={inputImportarRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={manejarArchivoImportar} />
          <Btn variant="primary" icon={<Plus size={14} />} onClick={abrirNuevo}>Nuevo contrato</Btn>
        </div>
      </div>

      <div className="resp-toolbar" style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por número, cliente, dirección..."
            style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, minWidth: 160 }}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={deudaFiltro} onChange={e => setDeudaFiltro(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, minWidth: 160 }}>
          <option value="">Todos (deuda)</option>
          <option value="aldia">Al día</option>
          <option value="condeuda">Con deuda</option>
          <option value="deuda1">Debe 1 mes</option>
          <option value="deuda2">Debe 2 meses</option>
          <option value="deuda3mas">Debe 3+ meses</option>
        </select>
        <select value={planFiltro} onChange={e => setPlanFiltro(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, minWidth: 160 }}>
          <option value="">Todos los planes</option>
          <option value="sinplan">Sin plan</option>
          {(planesQ.data || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <p style={{ fontSize: 12, color: 'var(--txt-3)', margin: '0 0 10px' }}>
        {contratosFiltrados.length} contrato{contratosFiltrados.length !== 1 ? 's' : ''}
        {contratosFiltrados.length !== contratos.length ? ` de ${contratos.length} totales` : ''}
      </p>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div className="resp-table">
        <Table loading={contratosQ.isLoading} headers={['N° Contrato', 'Abonado', 'DNI', 'Dirección / Sector', 'Celular', 'Plan', 'Estado', 'Deuda', 'Última actividad', '']}>
          {contratosPagina.length === 0 ? (
            <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin contratos registrados</td></tr>
          ) : contratosPagina.map(c => (
            <Tr key={c.id} onClick={() => setDrawerId(c.id)} style={{ cursor: 'pointer' }}>
              <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>{c.numero}</Td>
              <Td style={{ fontWeight: 600 }}>{c.cliente?.nombres} {c.cliente?.apellidos}</Td>
              <Td style={{ fontSize: 12, color: 'var(--txt-3)', fontFamily: 'var(--font-mono)' }}>{c.cliente?.dniRuc || '—'}</Td>
              <Td style={{ maxWidth: 200 }}>
                <div style={{ fontSize: 12, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.direccion}</div>
                {c.sector && <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{c.sector}</div>}
              </Td>
              <Td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{c.cliente?.telefono || '—'}</Td>
              <Td>
                {c.mbps ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700 }}>
                    {c.mbps} Mbps
                  </span>
                ) : <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>{c.plan?.nombre || '—'}</span>}
              </Td>
              <Td><Badge color={ESTADOS[c.estado]?.color || 'blue'}>{ESTADOS[c.estado]?.label || c.estado}</Badge></Td>
              <Td>
                {c.deudaPendiente > 0 ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: c.deudaVencida ? '#DC2626' : '#D97706' }}>
                    S/ {Number(c.deudaPendiente).toFixed(2)} · {c.mesesPendientes} mes{c.mesesPendientes !== 1 ? 'es' : ''}
                  </span>
                ) : <span style={{ color: '#16A34A', fontSize: 12, fontWeight: 600 }}>Al día</span>}
              </Td>
              <Td style={{ fontSize: 12, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{fmtFecha(c.ultimaActividad)}</div>
                {c.ultimoTipoOrden && <div style={{ fontSize: 10, marginTop: 1 }}>{tipoLabel(c.ultimoTipoOrden)}</div>}
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={(e) => { e.stopPropagation(); abrirEditar(c); }} />
                  {esAdmin && (
                    <Btn variant="ghost" size="sm" icon={<Trash2 size={13} color="#DC2626" />} onClick={(e) => { e.stopPropagation(); eliminarContrato(c); }} />
                  )}
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
        </div>

        <div className="resp-cards">
          {contratosPagina.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin contratos registrados</div>
          ) : contratosPagina.map(c => (
            <div key={c.id} className="resp-card" onClick={() => setDrawerId(c.id)}>
              <div className="resp-card-top">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{c.cliente?.nombres} {c.cliente?.apellidos}</div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)' }}>{c.numero}</span>
                </div>
                <Badge color={ESTADOS[c.estado]?.color || 'blue'}>{ESTADOS[c.estado]?.label || c.estado}</Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt-2)' }}>{c.direccion}{c.sector ? ` · ${c.sector}` : ''}</div>
              <div className="resp-card-tags">
                {c.mbps ? (
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700 }}>{c.mbps} Mbps</span>
                ) : c.plan?.nombre && <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{c.plan.nombre}</span>}
                {c.cliente?.telefono && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{c.cliente.telefono}</span>}
                {c.cliente?.dniRuc && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{c.cliente.dniRuc}</span>}
              </div>
              <div className="resp-card-row">
                {c.deudaPendiente > 0 ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: c.deudaVencida ? '#DC2626' : '#D97706' }}>
                    S/ {Number(c.deudaPendiente).toFixed(2)} · {c.mesesPendientes} mes{c.mesesPendientes !== 1 ? 'es' : ''}
                  </span>
                ) : <span style={{ color: '#16A34A', fontWeight: 600 }}>Al día</span>}
                <span>{fmtFecha(c.ultimaActividad)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignSelf: 'flex-end' }}>
                <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={(e) => { e.stopPropagation(); abrirEditar(c); }}>Editar</Btn>
                {esAdmin && (
                  <Btn variant="ghost" size="sm" icon={<Trash2 size={13} color="#DC2626" />} onClick={(e) => { e.stopPropagation(); eliminarContrato(c); }}>Eliminar</Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <Btn variant="ghost" size="sm" disabled={paginaSegura <= 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>
            Anterior
          </Btn>
          <span style={{ fontSize: 13, color: 'var(--txt-3)' }}>Página {paginaSegura} de {totalPaginas}</span>
          <Btn variant="ghost" size="sm" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>
            Siguiente
          </Btn>
        </div>
      )}

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title={modal?.id ? `Editar contrato` : 'Nuevo contrato'} width={620}>
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <SeccionLabel>Cliente</SeccionLabel>
              <BuscadorCliente
                value={modal.clienteId}
                label={modal.clienteLabel}
                onSelect={(c) => setModal(m => ({
                  ...m, clienteId: c?.id || '', clienteLabel: c ? `${c.nombres} ${c.apellidos || ''} — ${c.dniRuc}` : '',
                  clienteData: c || null, clienteCelular: c?.telefono || '',
                }))}
              />
              {modal.clienteId && (
                <Campo label="Celular">
                  <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.clienteCelular}
                    onChange={e => setModal({ ...modal, clienteCelular: e.target.value })} placeholder="999999999" />
                </Campo>
              )}

              <SeccionLabel>Ubicación</SeccionLabel>
              <Campo label="Dirección" required>
                <input style={campoInputStyle} value={modal.direccion} onChange={e => setModal({ ...modal, direccion: e.target.value })} placeholder="Av. Larco 123" />
              </Campo>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Referencia">
                  <input style={campoInputStyle} value={modal.referencia} onChange={e => setModal({ ...modal, referencia: e.target.value })} placeholder="Frente al parque" />
                </Campo>
                <Campo label="Sector">
                  <input style={campoInputStyle} value={modal.sector} onChange={e => setModal({ ...modal, sector: e.target.value })} placeholder="Sector 4" />
                </Campo>
              </div>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Latitud">
                  <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.latitud} onChange={e => setModal({ ...modal, latitud: e.target.value })} placeholder="-8.0834" />
                </Campo>
                <Campo label="Longitud">
                  <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.longitud} onChange={e => setModal({ ...modal, longitud: e.target.value })} placeholder="-78.9557" />
                </Campo>
              </div>
              {modal.id && (
                <Campo label="Punto de red (NAP/CTO)">
                  <select style={campoInputStyle} value={modal.puntoRedId} onChange={e => setModal({ ...modal, puntoRedId: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {(puntosQ.data || []).map(p => <option key={p.id} value={p.id}>{p.codigo} ({p.tipo})</option>)}
                  </select>
                </Campo>
              )}

              <SeccionLabel>Servicio</SeccionLabel>
              <Campo label="Tipo de servicio" required>
                <select style={campoInputStyle} value={modal.tipoServicio} onChange={e => setModal({ ...modal, tipoServicio: e.target.value, planId: '' })}>
                  {Object.entries(TIPOS_SERVICIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Campo>
              <Campo label="Plan">
                <select style={campoInputStyle} value={modal.planId} onChange={e => seleccionarPlan(e.target.value)}>
                  <option value="">Sin plan / manual</option>
                  {planesFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre} — S/{Number(p.precio).toFixed(2)}</option>)}
                </select>
              </Campo>
              <div className="resp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Campo label="Mbps">
                  <input type="number" style={campoInputStyle} value={modal.mbps} onChange={e => setModal({ ...modal, mbps: e.target.value })} />
                </Campo>
                <Campo label="Costo mensual (S/)">
                  <input type="number" step="0.01" style={campoInputStyle} value={modal.costoMensual} onChange={e => setModal({ ...modal, costoMensual: e.target.value })} />
                </Campo>
                <Campo label="Día de corte" required>
                  <input type="number" min="1" max="31" style={campoInputStyle} value={modal.diaCorte} onChange={e => setModal({ ...modal, diaCorte: e.target.value })} placeholder="15" />
                </Campo>
              </div>

              {requiereIp && (
                <div className="resp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <Campo label="IP WAN">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.ipWan} onChange={e => setModal({ ...modal, ipWan: e.target.value })} placeholder="192.168.1.10" />
                  </Campo>
                  <Campo label="Máscara">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.mascara} onChange={e => setModal({ ...modal, mascara: e.target.value })} placeholder="255.255.255.0" />
                  </Campo>
                  <Campo label="Gateway">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.gateway} onChange={e => setModal({ ...modal, gateway: e.target.value })} placeholder="192.168.1.1" />
                  </Campo>
                </div>
              )}

              {requiereIp && (
                <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Campo label="Usuario PPPoE">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.pppoeUsuario} onChange={e => setModal({ ...modal, pppoeUsuario: e.target.value })} placeholder="Manual o generado" />
                      <Btn type="button" variant="ghost" size="sm" onClick={async () => {
                        const zona = (modal.sector || '').trim().replace(/\s+/g, '').toUpperCase();
                        // Si el contrato ya existe usa su número real; si es nuevo, le pide al
                        // backend el correlativo que le va a tocar (el mismo que se le asignará al guardar).
                        let base = modal.numero;
                        if (!base) {
                          try {
                            base = (await contratosApi.siguienteNumero()).data.numero;
                          } catch {
                            toast.error('No se pudo calcular el número de contrato');
                            return;
                          }
                        }
                        setModal(m => ({ ...m, pppoeUsuario: zona ? `${base}-${zona}` : base }));
                      }}>Generar</Btn>
                    </div>
                  </Campo>
                  <Campo label="Contraseña PPPoE">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.pppoePassword} onChange={e => setModal({ ...modal, pppoePassword: e.target.value })} placeholder="Manual o generado (DNI)" />
                      <Btn type="button" variant="ghost" size="sm" onClick={() => {
                        const dni = modal.clienteData?.dniRuc;
                        if (!dni || dni.startsWith('SINDOC-')) { toast.error('Este cliente no tiene DNI/RUC registrado — ingresa la contraseña manualmente'); return; }
                        setModal(m => ({ ...m, pppoePassword: dni }));
                      }}>Generar</Btn>
                    </div>
                  </Campo>
                </div>
              )}

              {modal.id && (
                <>
                  <SeccionLabel>Instalación</SeccionLabel>
                  <p style={{ margin: '-8px 0 0', fontSize: 11.5, color: '#64748B' }}>
                    Estos datos se completan normalmente al cerrar la orden de instalación del técnico.
                  </p>
                  <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Campo label="Equipo instalado">
                      <select style={campoInputStyle} value={modal.equipoProductoId} onChange={e => setModal({ ...modal, equipoProductoId: e.target.value })}>
                        <option value="">Sin especificar</option>
                        {(catalogoQ.data || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </Campo>
                    <Campo label="N° serie / MAC">
                      <input style={campoInputStyle} value={modal.equipoSerie} onChange={e => setModal({ ...modal, equipoSerie: e.target.value })} placeholder="ABCD1234" />
                    </Campo>
                  </div>
                  <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Campo label="Técnico instalador">
                      <select style={campoInputStyle} value={modal.tecnicoInstaladorId} onChange={e => setModal({ ...modal, tecnicoInstaladorId: e.target.value })}>
                        <option value="">Sin especificar</option>
                        {(tecnicosQ.data || []).map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>)}
                      </select>
                    </Campo>
                    <Campo label="Fecha de instalación">
                      <input type="date" style={campoInputStyle} value={modal.fechaInstalacion} onChange={e => setModal({ ...modal, fechaInstalacion: e.target.value })} />
                    </Campo>
                  </div>
                  <Campo label="Precinto">
                    <input style={campoInputStyle} value={modal.precinto} onChange={e => setModal({ ...modal, precinto: e.target.value })} placeholder="PR-00123" />
                  </Campo>
                </>
              )}

              <SeccionLabel>Estado</SeccionLabel>
              <Campo label="Estado del contrato" required>
                <select style={campoInputStyle} value={modal.estado} onChange={e => setModal({ ...modal, estado: e.target.value })}>
                  {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Campo>
              {requiereBaja && (
                <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Campo label="Motivo">
                    <input style={campoInputStyle} value={modal.motivoBaja} onChange={e => setModal({ ...modal, motivoBaja: e.target.value })} placeholder="Falta de pago, mudanza..." />
                  </Campo>
                  <Campo label="Fecha">
                    <input type="date" style={campoInputStyle} value={modal.fechaBaja} onChange={e => setModal({ ...modal, fechaBaja: e.target.value })} />
                  </Campo>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid #EEF2F6', marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22 }}>
              <Btn onClick={() => setModal(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
              <Btn disabled={!formValido || guardarM.isPending} loading={guardarM.isPending} onClick={() => guardarM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>
                {modal.id ? 'Guardar cambios' : 'Crear contrato'}
              </Btn>
            </div>
          </>
        )}
      </Modal>

      <ContratoDrawer
        contratoId={drawerId}
        onCerrar={() => setDrawerId(null)}
        onEditar={(c) => { setDrawerId(null); abrirEditar(c); }}
      />

      <Modal open={Boolean(resultadoImport)} onClose={() => setResultadoImport(null)} title="Resultado de la importación" width={520}>
        {resultadoImport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>CREADOS</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#15803D' }}>{resultadoImport.creados}</div>
              </div>
              <div style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309' }}>OMITIDOS</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#B45309' }}>{resultadoImport.omitidos.length}</div>
              </div>
              <div style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>ERRORES</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{resultadoImport.errores.length}</div>
              </div>
            </div>

            {resultadoImport.omitidos.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', marginBottom: 6 }}>Omitidos</div>
                <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {resultadoImport.omitidos.map((o, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#64748B' }}>Fila {o.fila}: {o.motivo}</div>
                  ))}
                </div>
              </div>
            )}

            {resultadoImport.errores.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>Errores</div>
                <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {resultadoImport.errores.map((o, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#64748B' }}>Fila {o.fila}: {o.motivo}</div>
                  ))}
                </div>
              </div>
            )}

            <Btn onClick={() => setResultadoImport(null)} style={{ alignSelf: 'flex-end' }}>Cerrar</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}
