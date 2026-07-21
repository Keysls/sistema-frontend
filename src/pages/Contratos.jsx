import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileText, Plus, Pencil, Search, X } from 'lucide-react';
import { clientesApi, contratosApi, planesApi, puntosRedApi, productosApi, tecnicosApi } from '../services/api';
import { Btn, Badge, Modal, Table, Tr, Td } from '../components/ui';
import ContratoDrawer from '../components/ContratoDrawer';
import { tipoLabel } from '../utils/tiposOrden';

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
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
  tipoServicio: 'INTERNET', ipWan: '', mascara: '', gateway: '',
  latitud: '', longitud: '', precinto: '',
  planId: '', mbps: '', costoMensual: '', diaCorte: '',
  puntoRedId: '', equipoProductoId: '', equipoSerie: '',
  tecnicoInstaladorId: '', fechaInstalacion: '',
  estado: 'ACTIVO', motivoBaja: '', fechaBaja: '',
};

function BuscadorCliente({ value, label, onSelect }) {
  const [q, setQ] = useState('');
  const clientesQ = useQuery({
    queryKey: ['clientes-buscar', q],
    queryFn: () => clientesApi.listar({ q: q || undefined }).then(r => r.data),
    enabled: q.trim().length > 0,
  });

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
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o DNI/RUC..." style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: '#1E3A5F' }} />
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
        </div>
      )}
    </div>
  );
}

export default function Contratos() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [q, setQ] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

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

  const contratos = contratosQ.data || [];

  const abrirNuevo = () => setModal(emptyForm);
  const abrirEditar = (c) => setModal({
    id: c.id, clienteId: c.clienteId, clienteLabel: `${c.cliente?.nombres} ${c.cliente?.apellidos || ''} — ${c.cliente?.dniRuc}`,
    clienteData: c.cliente || null, clienteCelular: c.cliente?.telefono || '',
    direccion: c.direccion, referencia: c.referencia || '', sector: c.sector || '',
    tipoServicio: c.tipoServicio, ipWan: c.ipWan || '', mascara: c.mascara || '', gateway: c.gateway || '',
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
  const formValido = modal?.clienteId && modal?.direccion?.trim() && modal?.tipoServicio;

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
        <Btn variant="primary" icon={<Plus size={14} />} onClick={abrirNuevo}>Nuevo contrato</Btn>
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
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div className="resp-table">
        <Table loading={contratosQ.isLoading} headers={['N° Contrato', 'Abonado', 'DNI', 'Dirección / Sector', 'Celular', 'Plan', 'Estado', 'Deuda', 'Última actividad', '']}>
          {contratos.length === 0 ? (
            <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin contratos registrados</td></tr>
          ) : contratos.map(c => (
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
                <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={(e) => { e.stopPropagation(); abrirEditar(c); }} />
              </Td>
            </Tr>
          ))}
        </Table>
        </div>

        <div className="resp-cards">
          {contratos.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin contratos registrados</div>
          ) : contratos.map(c => (
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
              <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={(e) => { e.stopPropagation(); abrirEditar(c); }} style={{ alignSelf: 'flex-end' }}>Editar</Btn>
            </div>
          ))}
        </div>
      </div>

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
                <Campo label="Día de corte">
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
    </div>
  );
}
