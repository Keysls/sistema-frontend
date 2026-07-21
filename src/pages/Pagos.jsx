import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, Search, X, RefreshCw, CheckCircle2, MessageCircle, Download, AlertTriangle, FileSpreadsheet, TrendingDown, Plus, Wallet } from 'lucide-react';
import { contratosApi, cargosApi, pagosApi, empresaApi, egresosApi } from '../services/api';
import { Btn, Badge, Table, Tr, Td } from '../components/ui';
import { formatMetodosPagoTexto } from '../utils/metodosPago';

const METODOS = {
  EFECTIVO: 'Efectivo',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
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

function fmtPeriodo(periodo) {
  const [anio, mes] = periodo.split('-');
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${nombres[Number(mes) - 1]} ${anio}`;
}

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function linkWhatsapp(telefono, mensaje) {
  const digitos = (telefono || '').replace(/\D/g, '');
  const conCodigo = digitos.length === 9 ? `51${digitos}` : digitos;
  return `https://wa.me/${conCodigo}?text=${encodeURIComponent(mensaje)}`;
}

function mensajeRecordatorio(c, metodosPago) {
  const nombre = c.cliente?.nombres || 'cliente';
  const meses = c.mesesPendientes === 1 ? 'un mes' : `${c.mesesPendientes} meses`;
  return `Hola ${nombre}, te saludamos de Prointelco. Tu contrato ${c.numero} tiene una deuda pendiente de S/ ${Number(c.deudaPendiente).toFixed(2)} (${meses}). Tu fecha de corte es el día ${c.diaCorte || 1} de cada mes. Por favor regulariza tu pago para evitar el corte del servicio.${formatMetodosPagoTexto(metodosPago)}\n\n¡Gracias!`;
}

function exportarExcel(rows, columnas, nombreArchivo) {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet(rows);
    if (columnas) ws['!cols'] = columnas.map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, nombreArchivo);
  });
}

function exportarHistorialExcel(pagos) {
  const rows = pagos.map(p => {
    const primerCargo = p.cargos[0]?.cargo;
    const cliente = primerCargo?.contrato?.cliente;
    return {
      'Fecha': fmtFecha(p.fecha),
      'Cliente': `${cliente?.nombres || ''} ${cliente?.apellidos || ''}`.trim(),
      'DNI/RUC': cliente?.dniRuc || '',
      'Contrato': primerCargo?.contrato?.numero || '',
      'Períodos': p.cargos.map(pc => fmtPeriodo(pc.cargo.periodo)).join(', '),
      'Monto': Number(p.monto),
      'Método': METODOS[p.metodoPago] || p.metodoPago,
      'Registrado por': `${p.usuario?.nombre || ''} ${p.usuario?.apellido || ''}`.trim(),
      'Observación': p.observacion || '',
    };
  });
  exportarExcel(rows, [12, 24, 12, 14, 20, 10, 14, 18, 24], `historial_pagos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportarDeudoresExcel(deudores) {
  const rows = deudores.map(c => ({
    'Contrato': c.numero,
    'Cliente': `${c.cliente?.nombres || ''} ${c.cliente?.apellidos || ''}`.trim(),
    'DNI/RUC': c.cliente?.dniRuc || '',
    'Celular': c.cliente?.telefono || '',
    'Meses pendientes': c.mesesPendientes,
    'Deuda (S/)': Number(c.deudaPendiente),
    'Vencido': c.deudaVencida ? 'Sí' : 'No',
    'Día de corte': c.diaCorte || '',
  }));
  exportarExcel(rows, [14, 24, 12, 12, 16, 12, 10, 12], `clientes_con_deuda_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function descargarComprobante(pagoId, pagosApi) {
  try {
    const res = await pagosApi.comprobante(pagoId);
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    // Un <a target="_blank"> real (con un clic de verdad sobre él) abre pestaña
    // sin que el navegador lo trate como pop-up bloqueable, a diferencia de window.open().
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (err) {
    console.error('Error al generar el comprobante:', err);
    toast.error('No se pudo generar el comprobante');
  }
}

const METODO_COLOR = {
  EFECTIVO: '#16A34A', YAPE: '#7C3AED', PLIN: '#2563EB', TRANSFERENCIA: '#0891B2', TARJETA: '#D97706',
};

const emptyEgreso = { concepto: '', categoria: '', monto: '', fecha: new Date().toISOString().slice(0, 10), observacion: '' };

function ReporteCaja() {
  const qc = useQueryClient();
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const [fechaDesde, setFechaDesde] = useState(primerDiaMes);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().slice(0, 10));
  const [nuevoEgreso, setNuevoEgreso] = useState(null);

  const params = { fechaDesde: fechaDesde || undefined, fechaHasta: fechaHasta || undefined };

  const reporteQ = useQuery({
    queryKey: ['pagos-reporte', fechaDesde, fechaHasta],
    queryFn: () => pagosApi.reporte(params).then(r => r.data),
  });

  const egresosQ = useQuery({
    queryKey: ['egresos', fechaDesde, fechaHasta],
    queryFn: () => egresosApi.listar(params).then(r => r.data),
  });

  const crearEgresoM = useMutation({
    mutationFn: (payload) => egresosApi.crear(payload),
    onSuccess: () => {
      toast.success('Egreso registrado');
      setNuevoEgreso(null);
      qc.invalidateQueries({ queryKey: ['egresos'] });
      qc.invalidateQueries({ queryKey: ['pagos-reporte'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo registrar el egreso'),
  });

  const eliminarEgresoM = useMutation({
    mutationFn: (id) => egresosApi.eliminar(id),
    onSuccess: () => {
      toast.success('Egreso eliminado');
      qc.invalidateQueries({ queryKey: ['egresos'] });
      qc.invalidateQueries({ queryKey: ['pagos-reporte'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo eliminar'),
  });

  const egresos = egresosQ.data || [];
  const reporte = reporteQ.data;

  const egresoValido = nuevoEgreso && nuevoEgreso.concepto.trim() && nuevoEgreso.fecha && Number(nuevoEgreso.monto) > 0;

  const exportarReporteExcel = () => {
    const filas = [
      ...Object.entries(METODOS).map(([k, v]) => ({ Concepto: `Ingresos - ${v}`, Monto: Number(reporte?.porMetodo?.[k] || 0) })),
      { Concepto: 'Total Ingresos', Monto: Number(reporte?.totalIngresos || 0) },
      ...egresos.map(e => ({ Concepto: `Egreso: ${e.concepto}`, Monto: -Number(e.monto) })),
      { Concepto: 'Total Egresos', Monto: -Number(reporte?.totalEgresos || 0) },
      { Concepto: 'Saldo Neto', Monto: Number(reporte?.saldoNeto || 0) },
    ];
    exportarExcel(filas, [28, 14], `reporte_caja_${fechaDesde}_a_${fechaHasta}.xlsx`);
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 8, borderBottom: '1px solid #E2ECF4', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet size={14} color="#2563EB" />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Reporte de caja
          </span>
        </div>
        <Btn variant="ghost" size="sm" icon={<FileSpreadsheet size={13} />} onClick={exportarReporteExcel}>
          Exportar Excel
        </Btn>
      </div>

      <div className="resp-toolbar" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#64748B' }}>Del</span>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} max={fechaHasta || undefined}
          style={{ height: 34, padding: '0 10px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 6, fontSize: 13 }} />
        <span style={{ fontSize: 12, color: '#64748B' }}>al</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} min={fechaDesde || undefined}
          style={{ height: 34, padding: '0 10px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 6, fontSize: 13 }} />
      </div>

      {/* Ingresos por método */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', marginBottom: 8 }}>Ingresos por método de pago</div>
      <div className="resp-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {Object.entries(METODOS).map(([k, v]) => (
          <div key={k} style={{ padding: '10px 12px', borderRadius: 8, background: '#F8FAFC', border: `1px solid ${METODO_COLOR[k]}33` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: METODO_COLOR[k], textTransform: 'uppercase' }}>{v}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1E3A5F', fontFamily: 'monospace' }}>
              S/ {Number(reporte?.porMetodo?.[k] || 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 140, padding: '12px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>TOTAL INGRESOS</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#15803D', fontFamily: 'monospace' }}>S/ {Number(reporte?.totalIngresos || 0).toFixed(2)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, padding: '12px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>TOTAL EGRESOS</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#DC2626', fontFamily: 'monospace' }}>S/ {Number(reporte?.totalEgresos || 0).toFixed(2)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, padding: '12px 14px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1E3A8A' }}>SALDO NETO</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1E3A8A', fontFamily: 'monospace' }}>S/ {Number(reporte?.saldoNeto || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Egresos */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>Egresos ({egresos.length})</div>
        {!nuevoEgreso && (
          <Btn variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => setNuevoEgreso(emptyEgreso)}>
            Registrar egreso
          </Btn>
        )}
      </div>

      {nuevoEgreso && (
        <div style={{ border: '1px dashed #C9DAEA', borderRadius: 10, padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Campo label="Concepto" required>
              <input style={campoInputStyle} value={nuevoEgreso.concepto} onChange={e => setNuevoEgreso({ ...nuevoEgreso, concepto: e.target.value })} placeholder="Pago de luz, sueldo técnico, etc." />
            </Campo>
            <Campo label="Categoría (opcional)">
              <input style={campoInputStyle} value={nuevoEgreso.categoria} onChange={e => setNuevoEgreso({ ...nuevoEgreso, categoria: e.target.value })} placeholder="Servicios, planilla, insumos..." />
            </Campo>
          </div>
          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Campo label="Monto (S/)" required>
              <input type="number" step="0.01" style={campoInputStyle} value={nuevoEgreso.monto} onChange={e => setNuevoEgreso({ ...nuevoEgreso, monto: e.target.value })} />
            </Campo>
            <Campo label="Fecha" required>
              <input type="date" style={campoInputStyle} value={nuevoEgreso.fecha} onChange={e => setNuevoEgreso({ ...nuevoEgreso, fecha: e.target.value })} />
            </Campo>
          </div>
          <Campo label="Observación (opcional)">
            <input style={campoInputStyle} value={nuevoEgreso.observacion} onChange={e => setNuevoEgreso({ ...nuevoEgreso, observacion: e.target.value })} />
          </Campo>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setNuevoEgreso(null)}>Cancelar</Btn>
            <Btn disabled={!egresoValido || crearEgresoM.isPending} loading={crearEgresoM.isPending} onClick={() => crearEgresoM.mutate(nuevoEgreso)} style={{ background: '#DC2626' }}>
              Guardar egreso
            </Btn>
          </div>
        </div>
      )}

      {egresos.length === 0 ? (
        <div style={{ padding: '16px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Sin egresos registrados en este período</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {egresos.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
              <TrendingDown size={14} color="#DC2626" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{e.concepto}</div>
                <div style={{ fontSize: 11, color: '#8AAABB' }}>
                  {fmtFecha(e.fecha)}{e.categoria ? ` · ${e.categoria}` : ''} · {e.usuario?.nombre} {e.usuario?.apellido}
                </div>
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#DC2626' }}>- S/ {Number(e.monto).toFixed(2)}</span>
              <Btn variant="ghost" size="sm" icon={<X size={13} />} onClick={() => eliminarEgresoM.mutate(e.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BuscadorContrato({ value, label, onSelect }) {
  const [q, setQ] = useState('');
  const contratosQ = useQuery({
    queryKey: ['contratos-buscar-pago', q],
    queryFn: () => contratosApi.listar({ q: q || undefined }).then(r => r.data),
    enabled: q.trim().length > 0,
  });

  return (
    <div>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 8 }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
          <button type="button" onClick={() => onSelect(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={15} /></button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 40, border: '1px solid #C9DAEA', borderRadius: 8, background: '#E1EBF5' }}>
            <Search size={15} color="#64748B" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, DNI/RUC o N° contrato..." style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: '#1E3A5F' }} />
          </div>
          {q.trim() && (contratosQ.data || []).length > 0 && (
            <div style={{ border: '1px solid #C9DAEA', borderRadius: 8, marginTop: 6, maxHeight: 220, overflowY: 'auto', background: '#fff' }}>
              {contratosQ.data.map(c => (
                <button key={c.id} type="button" onClick={() => onSelect(c)}
                  style={{ width: '100%', border: 0, background: 'transparent', padding: '10px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', borderBottom: '1px solid #EEF2F6' }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <strong>{c.cliente?.nombres} {c.cliente?.apellidos}</strong>
                    <span style={{ color: '#64748B', fontSize: 12, fontFamily: 'monospace' }}>{c.numero}</span>
                  </span>
                  <span style={{ color: '#64748B', fontSize: 11 }}>{c.cliente?.dniRuc} · {c.direccion}</span>
                </button>
              ))}
            </div>
          )}
          {q.trim() && !contratosQ.isLoading && (contratosQ.data || []).length === 0 && (
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Sin resultados</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Pagos() {
  const qc = useQueryClient();
  const [contrato, setContrato] = useState(null);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [observacion, setObservacion] = useState('');
  const [qHistorial, setQHistorial] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [metodoFiltro, setMetodoFiltro] = useState('');

  const cargosQ = useQuery({
    queryKey: ['cargos-contrato', contrato?.id],
    queryFn: () => cargosApi.porContrato(contrato.id).then(r => r.data),
    enabled: Boolean(contrato),
  });

  const contratosQ = useQuery({
    queryKey: ['contratos'],
    queryFn: () => contratosApi.listar().then(r => r.data),
  });

  const empresaQ = useQuery({ queryKey: ['empresa'], queryFn: () => empresaApi.obtener().then(r => r.data) });
  const metodosPago = empresaQ.data?.metodosPago || [];

  const deudores = useMemo(() => {
    return (contratosQ.data || [])
      .filter(c => c.deudaPendiente > 0)
      .sort((a, b) => (b.deudaVencida - a.deudaVencida) || (b.deudaPendiente - a.deudaPendiente));
  }, [contratosQ.data]);

  const historialQ = useQuery({
    queryKey: ['pagos', qHistorial, fechaDesde, fechaHasta, metodoFiltro],
    queryFn: () => pagosApi.listar({
      q: qHistorial || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      metodoPago: metodoFiltro || undefined,
    }).then(r => r.data),
  });

  const generarM = useMutation({
    mutationFn: () => cargosApi.generar(),
    onSuccess: (res) => {
      toast.success(`${res.data.creados} cargo(s) generado(s) para el período ${res.data.periodo}`);
      qc.invalidateQueries({ queryKey: ['cargos-contrato'] });
      qc.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo generar los cargos'),
  });

  const registrarM = useMutation({
    mutationFn: () => pagosApi.crear({
      contratoId: contrato.id, fecha, metodoPago, observacion,
      cargoIds: [...seleccionados],
    }),
    onSuccess: () => {
      toast.success('Pago registrado');
      setSeleccionados(new Set());
      setObservacion('');
      qc.invalidateQueries({ queryKey: ['cargos-contrato'] });
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo registrar el pago'),
  });

  const cargos = cargosQ.data || [];
  const pagos = historialQ.data || [];

  const toggleCargo = (id) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const montoTotal = useMemo(
    () => cargos.filter(c => seleccionados.has(c.id)).reduce((sum, c) => sum + Number(c.monto), 0),
    [cargos, seleccionados]
  );

  const seleccionarContrato = (c) => {
    setContrato(c);
    setSeleccionados(new Set());
  };

  const puedeRegistrar = contrato && seleccionados.size > 0 && fecha && metodoPago && !registrarM.isPending;

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <DollarSign size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Pagos</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Registro de cobros mensuales</p>
          </div>
        </div>
        <Btn variant="ghost" icon={<RefreshCw size={14} />} disabled={generarM.isPending} onClick={() => generarM.mutate()}>
          Generar cargos del mes
        </Btn>
      </div>

      <ReporteCaja />

      {/* ── Clientes con deuda ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 8, borderBottom: '1px solid #E2ECF4', marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color="#DC2626" />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Clientes con deuda ({deudores.length})
            </span>
          </div>
          <Btn variant="ghost" size="sm" icon={<FileSpreadsheet size={13} />} disabled={deudores.length === 0} onClick={() => exportarDeudoresExcel(deudores)}>
            Exportar Excel
          </Btn>
        </div>

        {contratosQ.isLoading ? (
          <p style={{ fontSize: 13, color: '#64748B' }}>Cargando...</p>
        ) : deudores.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#15803D', fontSize: 13, fontWeight: 600 }}>
            <CheckCircle2 size={15} /> Ningún cliente tiene deuda pendiente
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
            {deudores.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.deudaVencida ? '#FECACA' : '#FDE68A'}`, background: c.deudaVencida ? '#FEF2F2' : '#FFFBEB' }}>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => seleccionarContrato(c)}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>{c.cliente?.nombres} {c.cliente?.apellidos}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{c.numero} · {c.mesesPendientes} mes{c.mesesPendientes !== 1 ? 'es' : ''} pendiente{c.mesesPendientes !== 1 ? 's' : ''}</div>
                </div>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: c.deudaVencida ? '#DC2626' : '#B45309' }}>
                  S/ {Number(c.deudaPendiente).toFixed(2)}
                </span>
                {c.cliente?.telefono && (
                  <a href={linkWhatsapp(c.cliente.telefono, mensajeRecordatorio(c, metodosPago))} target="_blank" rel="noopener noreferrer" title="Enviar recordatorio"
                    style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #C9DAEA', color: '#16A34A', flexShrink: 0 }}>
                    <MessageCircle size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Registrar cobro ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 8, borderBottom: '1px solid #E2ECF4', marginBottom: 16 }}>
          Registrar cobro
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Campo label="Cliente / Contrato" required>
            <BuscadorContrato
              value={contrato?.id}
              label={contrato ? `${contrato.cliente?.nombres} ${contrato.cliente?.apellidos} — ${contrato.numero}` : ''}
              onSelect={seleccionarContrato}
            />
          </Campo>

          {contrato && (
            <>
              <Campo label="Meses pendientes">
                {cargosQ.isLoading ? (
                  <p style={{ fontSize: 13, color: '#64748B' }}>Cargando deuda...</p>
                ) : cargos.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#15803D', fontSize: 13, fontWeight: 600 }}>
                    <CheckCircle2 size={15} /> Este contrato no tiene deuda pendiente
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cargos.map(c => (
                      <label key={c.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${seleccionados.has(c.id) ? '#2563EB' : '#C9DAEA'}`,
                        background: seleccionados.has(c.id) ? '#EFF6FF' : '#F8FAFC',
                      }}>
                        <input type="checkbox" checked={seleccionados.has(c.id)} onChange={() => toggleCargo(c.id)} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{fmtPeriodo(c.periodo)}</span>
                        {c.vencido && <Badge color="red">Vencido</Badge>}
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>S/ {Number(c.monto).toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </Campo>

              {cargos.length > 0 && (
                <>
                  <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Campo label="Fecha de pago" required>
                      <input type="date" style={campoInputStyle} value={fecha} onChange={e => setFecha(e.target.value)} />
                    </Campo>
                    <Campo label="Método de pago" required>
                      <select style={campoInputStyle} value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                        {Object.entries(METODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </Campo>
                  </div>
                  <Campo label="Observación (opcional)">
                    <input style={campoInputStyle} value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Referencia de transferencia, etc." />
                  </Campo>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A8A' }}>Monto a cobrar ({seleccionados.size} mes{seleccionados.size !== 1 ? 'es' : ''})</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#1E3A8A', fontFamily: 'monospace' }}>S/ {montoTotal.toFixed(2)}</span>
                  </div>

                  <Btn disabled={!puedeRegistrar} loading={registrarM.isPending} onClick={() => registrarM.mutate()} style={{ background: '#16A34A', fontWeight: 700 }}>
                    Registrar cobro
                  </Btn>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Historial ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>Historial de pagos</div>
        <Btn variant="ghost" size="sm" icon={<FileSpreadsheet size={13} />} disabled={pagos.length === 0} onClick={() => exportarHistorialExcel(pagos)}>
          Exportar Excel
        </Btn>
      </div>

      <div className="resp-toolbar" style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
          <input value={qHistorial} onChange={e => setQHistorial(e.target.value)} placeholder="Buscar por cliente, DNI o contrato..."
            style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} max={fechaHasta || undefined}
          title="Desde"
          style={{ height: 36, padding: '0 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, outline: 'none' }} />
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} min={fechaDesde || undefined}
          title="Hasta"
          style={{ height: 36, padding: '0 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, outline: 'none' }} />
        <select value={metodoFiltro} onChange={e => setMetodoFiltro(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, minWidth: 150 }}>
          <option value="">Todos los métodos</option>
          {Object.entries(METODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(fechaDesde || fechaHasta || metodoFiltro) && (
          <Btn variant="ghost" size="sm" icon={<X size={13} />} onClick={() => { setFechaDesde(''); setFechaHasta(''); setMetodoFiltro(''); }}>
            Limpiar
          </Btn>
        )}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div className="resp-table">
        <Table loading={historialQ.isLoading} headers={['Fecha', 'Cliente', 'Contrato', 'Períodos', 'Monto', 'Método', 'Registrado por', '']}>
          {pagos.length === 0 ? (
            <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin pagos registrados</td></tr>
          ) : pagos.map(p => {
            const primerCargo = p.cargos[0]?.cargo;
            const cliente = primerCargo?.contrato?.cliente;
            return (
              <Tr key={p.id}>
                <Td style={{ fontSize: 12, color: 'var(--txt-3)' }}>{fmtFecha(p.fecha)}</Td>
                <Td style={{ fontWeight: 600 }}>{cliente?.nombres} {cliente?.apellidos}</Td>
                <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{primerCargo?.contrato?.numero}</Td>
                <Td style={{ fontSize: 12, color: 'var(--txt-3)' }}>{p.cargos.map(pc => fmtPeriodo(pc.cargo.periodo)).join(', ')}</Td>
                <Td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>S/ {Number(p.monto).toFixed(2)}</Td>
                <Td><Badge color="blue">{METODOS[p.metodoPago]}</Badge></Td>
                <Td style={{ fontSize: 12, color: 'var(--txt-3)' }}>{p.usuario?.nombre} {p.usuario?.apellido}</Td>
                <Td>
                  <Btn variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => descargarComprobante(p.id, pagosApi)}>
                    Comprobante
                  </Btn>
                </Td>
              </Tr>
            );
          })}
        </Table>
        </div>

        <div className="resp-cards">
          {pagos.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin pagos registrados</div>
          ) : pagos.map(p => {
            const primerCargo = p.cargos[0]?.cargo;
            const cliente = primerCargo?.contrato?.cliente;
            return (
              <div key={p.id} className="resp-card">
                <div className="resp-card-top">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{cliente?.nombres} {cliente?.apellidos}</div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{primerCargo?.contrato?.numero}</span>
                  </div>
                  <Badge color="blue">{METODOS[p.metodoPago]}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>{p.cargos.map(pc => fmtPeriodo(pc.cargo.periodo)).join(', ')}</div>
                <div className="resp-card-row">
                  <span>{fmtFecha(p.fecha)} · {p.usuario?.nombre} {p.usuario?.apellido}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--txt)' }}>S/ {Number(p.monto).toFixed(2)}</span>
                </div>
                <Btn variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => descargarComprobante(p.id, pagosApi)} style={{ alignSelf: 'flex-end' }}>
                  Comprobante
                </Btn>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
