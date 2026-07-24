import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, Pencil, Search, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { contratosApi, ordenesApi, planesApi, tecnicosApi } from '../services/api';
import { Btn, Badge, Modal, Table, Tr, Td } from '../components/ui';
import { TIPOS_ORDEN, SERVICIO_LABEL } from '../utils/tiposOrden';
import OrdenDrawer from '../components/OrdenDrawer';

const SUFIJO_POR_SERVICIO = { INTERNET: 'I', CABLE: 'C', DUO: 'D' };

const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: 'yellow' },
  ASIGNADA: { label: 'Asignada', color: 'blue' },
  EN_PROCESO: { label: 'En proceso', color: 'blue' },
  COMPLETADA: { label: 'Completada', color: 'green' },
  CANCELADA: { label: 'Cancelada', color: 'red' },
};

const TABS = [
  { key: '', label: 'Todos' },
  { key: 'I', label: '📡 Internet' },
  { key: 'C', label: '📺 Cable' },
  { key: 'D', label: '📡📺 Dúo' },
];

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

const hoy = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  id: null, contratoId: '', contratoLabel: '', contratoServicio: '', contratoEstado: '', tipoOrden: 'INSTALACION_I',
  fechaServicio: hoy(), abonado: '', dni: '', direccion: '', referencia: '', sector: '', celular: '',
  observacion: '', tecnicoId: '', ipWan: '', mascara: '', gateway: '', pppoeUsuario: '', pppoePassword: '', mensualidad: '', mbps: '', planId: '',
};

const ESTADO_CONTRATO_INFO = {
  SUSPENDIDO: { label: 'Suspendido', bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' },
  CORTADO: { label: 'Cortado', bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' },
  BAJA: { label: 'Dado de baja', bg: '#F1F5F9', border: '#E2E8F0', color: '#475569' },
};

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtFechaHora(f) {
  if (!f) return '—';
  return new Date(f).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function BuscadorContrato({ contratos, contratoId, contratoLabel, servicioSufijo, onSeleccionar, onLimpiar }) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);

  const resultados = useMemo(() => {
    if (!q.trim()) return [];
    const term = q.trim().toLowerCase();
    return (contratos || []).filter(c => {
      const nombre = `${c.cliente?.nombres || ''} ${c.cliente?.apellidos || ''}`.toLowerCase();
      return c.numero.toLowerCase().includes(term) || nombre.includes(term) || (c.cliente?.dniRuc || '').includes(term);
    }).slice(0, 8);
  }, [contratos, q]);

  if (contratoId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1E3A5F' }}>{contratoLabel}</div>
          {servicioSufijo && <Badge color="blue">{SERVICIO_LABEL[servicioSufijo]}</Badge>}
        </div>
        <Btn variant="ghost" size="sm" icon={<X size={13} />} onClick={onLimpiar}>Quitar</Btn>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7E9BB8' }} />
        <input
          style={{ ...campoInputStyle, paddingLeft: 32 }}
          placeholder="Buscar por nombre, DNI o N° de contrato..."
          value={q}
          onChange={e => { setQ(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
        />
      </div>
      {abierto && resultados.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #E2ECF4', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 20, maxHeight: 220, overflowY: 'auto' }}>
          {resultados.map(c => {
            const sufijo = SUFIJO_POR_SERVICIO[c.tipoServicio];
            return (
              <div key={c.id}
                onClick={() => { onSeleccionar(c); setQ(''); setAbierto(false); }}
                style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{c.cliente?.nombres} {c.cliente?.apellidos}</div>
                  <div style={{ fontSize: 11, color: '#7E9BB8' }}>{c.numero}</div>
                </div>
                <Badge color="blue">{SERVICIO_LABEL[sufijo] || c.tipoServicio}</Badge>
              </div>
            );
          })}
        </div>
      )}
      {abierto && q.trim() && resultados.length === 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #E2ECF4', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#7E9BB8', zIndex: 20 }}>
          Sin resultados
        </div>
      )}
    </div>
  );
}

export default function OrdenesServicio() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [tab, setTab] = useState('');
  const [q, setQ] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  const ordenesQ = useQuery({
    queryKey: ['ordenes-servicio', q, estadoFiltro, tab],
    queryFn: () => ordenesApi.listar({ q: q || undefined, estado: estadoFiltro || undefined, grupo: tab || undefined }).then(r => r.data),
  });

  const contratosQ = useQuery({ queryKey: ['contratos'], queryFn: () => contratosApi.listar().then(r => r.data) });
  const tecnicosQ = useQuery({ queryKey: ['tecnicos-select'], queryFn: () => tecnicosApi.listar().then(r => r.data) });
  const planesQ = useQuery({ queryKey: ['planes'], queryFn: () => planesApi.listar({ soloActivos: 'true' }).then(r => r.data) });

  const tipoInfo = TIPOS_ORDEN[modal?.tipoOrden] || {};
  // El plan solo tiene sentido elegirlo al instalar, cambiar de plan o reconectar —
  // en avería, corte, retiro de equipo, etc. no aplica tocar el plan del contrato.
  const tipoBaseModal = (modal?.tipoOrden || '').replace(/_[ICD]$/, '');
  const permitePlan = ['INSTALACION', 'CAMBIO_PLAN', 'RECONEXION'].includes(tipoBaseModal);
  // Si se está eligiendo un plan (ej. un contrato de Cable que migra a Internet o
  // Dúo con un "Cambio de plan"), los campos de IP/PPPoE dependen del tipo de
  // servicio del plan NUEVO, no del sufijo original de la orden (que sigue siendo
  // _C aunque el cliente esté migrando a un plan de Internet).
  const planSeleccionado = permitePlan ? (planesQ.data || []).find(p => p.id === modal?.planId) : null;
  const tipoServicioEfectivo = planSeleccionado ? planSeleccionado.tipoServicio : modal?.contratoServicio;
  const requiereIp = tipoServicioEfectivo === 'INTERNET' || tipoServicioEfectivo === 'DUO' || tipoInfo.sufijo === 'I' || tipoInfo.sufijo === 'D';
  const sufijosPermitidos = modal?.contratoServicio ? [SUFIJO_POR_SERVICIO[modal.contratoServicio]] : ['I', 'C', 'D'];
  // Un contrato no-activo (cortado/suspendido/baja) solo puede reconectarse o
  // que le retiren el equipo — no tiene sentido abrirle otros tipos de orden.
  const contratoInactivo = Boolean(modal?.contratoId) && modal?.contratoEstado && modal.contratoEstado !== 'ACTIVO';
  const tiposBasePermitidos = contratoInactivo ? ['RECONEXION', 'RETIRO_EQUIPO'] : null;

  const guardarM = useMutation({
    mutationFn: () => {
      const payload = { ...modal };
      delete payload.id;
      delete payload.contratoLabel;
      return modal.id ? ordenesApi.actualizar(modal.id, payload) : ordenesApi.crear(payload);
    },
    onSuccess: () => {
      toast.success(modal.id ? 'Orden actualizada' : 'Orden creada');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['ordenes-servicio'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar la orden'),
  });

  const ordenes = ordenesQ.data || [];

  const abrirNuevo = () => setModal(emptyForm);
  const abrirEditar = (o) => setModal({
    id: o.id, contratoId: o.contratoId || '', contratoLabel: o.contrato?.numero || '',
    contratoServicio: o.contrato?.tipoServicio || '', contratoEstado: o.contrato?.estado || '',
    tipoOrden: o.tipoOrden, fechaServicio: o.fechaServicio?.slice(0, 10) || hoy(),
    abonado: o.abonado, dni: o.dni || '', direccion: o.direccion, referencia: o.referencia || '',
    sector: o.sector || '', celular: o.celular || '', observacion: o.observacion || '',
    tecnicoId: o.tecnicoId || '', ipWan: o.ipWan || '', mascara: o.mascara || '', gateway: o.gateway || '',
    pppoeUsuario: o.pppoeUsuario || '', pppoePassword: o.pppoePassword || '',
    mensualidad: o.mensualidad ?? '', mbps: o.mbps ?? '', planId: o.planId || '',
  });

  const formValido = modal?.tipoOrden && modal?.fechaServicio && modal?.abonado?.trim() && modal?.direccion?.trim();

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <ClipboardList size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Órdenes de servicio</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>{ordenes.length} orden{ordenes.length !== 1 ? 'es' : ''}</p>
          </div>
        </div>
        <Btn variant="primary" icon={<Plus size={14} />} onClick={abrirNuevo}>Nueva orden</Btn>
      </div>

      {/* Tabs por tipo de servicio */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1px solid', transition: 'all .15s',
              background: tab === t.key ? 'var(--accent, #1E3A8A)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--txt-2)',
              borderColor: tab === t.key ? 'var(--accent, #1E3A8A)' : 'var(--border-2)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="resp-toolbar" style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por N° orden, abonado, DNI, dirección..."
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
        <Table loading={ordenesQ.isLoading} headers={['N° Orden', 'Abonado', 'Dirección / Referencia', 'Servicio', 'Fecha', 'Estado', 'Técnico', 'Completado', '']}>
          {ordenes.length === 0 ? (
            <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin órdenes registradas</td></tr>
          ) : ordenes.map(o => {
            const info = TIPOS_ORDEN[o.tipoOrden] || {};
            return (
              <Tr key={o.id} onClick={() => setDrawerId(o.id)} style={{ cursor: 'pointer' }}>
                <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>{o.nServicio}</Td>
                <Td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{o.abonado}</div>
                  {o.dni && <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{o.dni}</div>}
                </Td>
                <Td style={{ maxWidth: 200 }}>
                  <div style={{ fontSize: 12, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.direccion}</div>
                  {o.referencia && <div style={{ fontSize: 11, color: 'var(--txt-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Ref: {o.referencia}</div>}
                </Td>
                <Td>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{info.label || o.tipoOrden}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{info.servicio}</div>
                </Td>
                <Td style={{ color: 'var(--txt-3)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtFecha(o.fechaServicio)}</Td>
                <Td><Badge color={ESTADOS[o.estado]?.color || 'blue'}>{ESTADOS[o.estado]?.label || o.estado}</Badge></Td>
                <Td style={{ color: 'var(--txt-3)', fontSize: 12 }}>{o.tecnico ? `${o.tecnico.nombre} ${o.tecnico.apellido}` : '—'}</Td>
                <Td style={{ fontSize: 12, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>
                  {o.estado === 'COMPLETADA' && o.fechaFin
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16A34A', fontWeight: 600 }}><CheckCircle2 size={12} /> {fmtFechaHora(o.fechaFin)}</span>
                    : '—'}
                </Td>
                <Td>
                  <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={(e) => { e.stopPropagation(); abrirEditar(o); }} />
                </Td>
              </Tr>
            );
          })}
        </Table>
        </div>

        <div className="resp-cards">
          {ordenes.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin órdenes registradas</div>
          ) : ordenes.map(o => {
            const info = TIPOS_ORDEN[o.tipoOrden] || {};
            return (
              <div key={o.id} className="resp-card" onClick={() => setDrawerId(o.id)}>
                <div className="resp-card-top">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{o.abonado}</div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)' }}>{o.nServicio}</span>
                  </div>
                  <Badge color={ESTADOS[o.estado]?.color || 'blue'}>{ESTADOS[o.estado]?.label || o.estado}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt-2)' }}>{o.direccion}</div>
                <div className="resp-card-tags">
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-2)' }}>{info.label || o.tipoOrden}</span>
                  {o.tecnico && <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{o.tecnico.nombre} {o.tecnico.apellido}</span>}
                </div>
                <div className="resp-card-row">
                  <span>{fmtFecha(o.fechaServicio)}</span>
                  {o.estado === 'COMPLETADA' && o.fechaFin
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16A34A', fontWeight: 600 }}><CheckCircle2 size={12} /> {fmtFechaHora(o.fechaFin)}</span>
                    : null}
                </div>
                <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={(e) => { e.stopPropagation(); abrirEditar(o); }} style={{ alignSelf: 'flex-end' }}>Editar</Btn>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title={modal?.id ? 'Editar orden de servicio' : 'Nueva orden de servicio'} width={600}>
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <SeccionLabel>Contrato relacionado</SeccionLabel>
              <BuscadorContrato
                contratos={contratosQ.data}
                contratoId={modal.contratoId}
                contratoLabel={modal.contratoLabel}
                servicioSufijo={SUFIJO_POR_SERVICIO[modal.contratoServicio]}
                onSeleccionar={(c) => {
                  const sufijo = SUFIJO_POR_SERVICIO[c.tipoServicio];
                  const tipoActualValido = TIPOS_ORDEN[modal.tipoOrden]?.sufijo === sufijo;
                  const primerTipo = Object.entries(TIPOS_ORDEN).find(([, v]) => v.sufijo === sufijo)?.[0];
                  // Si el contrato no está activo (cortado/suspendido/baja), lo lógico es
                  // reconectarlo primero: se sugiere ese tipo de orden en vez del primero de la lista.
                  const tipoReconexion = `RECONEXION_${sufijo}`;
                  const noEstaActivo = c.estado && c.estado !== 'ACTIVO';
                  const tipoSugerido = noEstaActivo && TIPOS_ORDEN[tipoReconexion] ? tipoReconexion : (primerTipo || modal.tipoOrden);
                  setModal(m => ({
                    ...m, contratoId: c.id, contratoLabel: `${c.numero} — ${c.cliente?.nombres} ${c.cliente?.apellidos || ''}`.trim(),
                    contratoServicio: c.tipoServicio, contratoEstado: c.estado || '',
                    tipoOrden: noEstaActivo ? tipoSugerido : (tipoActualValido ? m.tipoOrden : tipoSugerido),
                    abonado: `${c.cliente?.nombres} ${c.cliente?.apellidos || ''}`.trim(), dni: c.cliente?.dniRuc || '',
                    direccion: c.direccion, referencia: c.referencia || '', sector: c.sector || '', celular: c.cliente?.telefono || '',
                    planId: c.planId || '', mbps: c.mbps ?? (c.plan?.mbps ?? ''),
                    mensualidad: c.costoMensual != null ? c.costoMensual : (c.plan?.precio ?? ''),
                    ipWan: c.ipWan || '', mascara: c.mascara || '', gateway: c.gateway || '',
                    pppoeUsuario: c.pppoeUsuario || '', pppoePassword: c.pppoePassword || '',
                  }));
                }}
                onLimpiar={() => setModal(m => ({ ...m, contratoId: '', contratoLabel: '', contratoServicio: '', contratoEstado: '' }))}
              />
              {!modal.contratoId && (
                <p style={{ margin: '-10px 0 0', fontSize: 11.5, color: '#7E9BB8' }}>Opcional: puedes crear una orden sin contrato (instalación nueva).</p>
              )}
              {modal.contratoId && ESTADO_CONTRATO_INFO[modal.contratoEstado] && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, margin: '-10px 0 0', padding: '9px 12px',
                  background: ESTADO_CONTRATO_INFO[modal.contratoEstado].bg,
                  border: `1px solid ${ESTADO_CONTRATO_INFO[modal.contratoEstado].border}`,
                  borderRadius: 8, color: ESTADO_CONTRATO_INFO[modal.contratoEstado].color,
                }}>
                  <AlertTriangle size={15} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                    Atención: este contrato está actualmente <strong>{ESTADO_CONTRATO_INFO[modal.contratoEstado].label}</strong>.
                  </span>
                </div>
              )}

              <SeccionLabel>Datos del abonado</SeccionLabel>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Abonado" required>
                  <input style={campoInputStyle} value={modal.abonado} onChange={e => setModal({ ...modal, abonado: e.target.value })} />
                </Campo>
                <Campo label="DNI">
                  <input style={campoInputStyle} value={modal.dni} onChange={e => setModal({ ...modal, dni: e.target.value })} />
                </Campo>
              </div>
              <Campo label="Dirección" required>
                <input style={campoInputStyle} value={modal.direccion} onChange={e => setModal({ ...modal, direccion: e.target.value })} />
              </Campo>
              <div className="resp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Campo label="Referencia">
                  <input style={campoInputStyle} value={modal.referencia} onChange={e => setModal({ ...modal, referencia: e.target.value })} />
                </Campo>
                <Campo label="Sector">
                  <input style={campoInputStyle} value={modal.sector} onChange={e => setModal({ ...modal, sector: e.target.value })} />
                </Campo>
                <Campo label="Celular">
                  <input style={campoInputStyle} value={modal.celular} onChange={e => setModal({ ...modal, celular: e.target.value })} />
                </Campo>
              </div>

              <SeccionLabel>Plan y datos técnicos</SeccionLabel>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Tipo de orden" required>
                  <select style={campoInputStyle} value={modal.tipoOrden} onChange={e => setModal({ ...modal, tipoOrden: e.target.value })}>
                    {sufijosPermitidos.map(suf => (
                      <optgroup key={suf} label={SERVICIO_LABEL[suf]}>
                        {Object.entries(TIPOS_ORDEN).filter(([k, v]) => v.sufijo === suf && (!tiposBasePermitidos || tiposBasePermitidos.some(base => k.startsWith(base)))).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Campo>
                <Campo label="Fecha de servicio" required>
                  <input type="date" style={campoInputStyle} value={modal.fechaServicio} onChange={e => setModal({ ...modal, fechaServicio: e.target.value })} />
                </Campo>
              </div>
              {permitePlan ? (
                <div className="resp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <Campo label="Plan">
                    <select style={campoInputStyle} value={modal.planId} onChange={e => {
                      const planId = e.target.value;
                      const plan = (planesQ.data || []).find(p => p.id === planId);
                      // Al elegir un plan, sus Mbps y precio se copian al formulario —
                      // si no se hace esto, "Cambio de plan" cambia el nombre del plan
                      // pero deja la mensualidad y velocidad viejas del plan anterior.
                      setModal(m => ({
                        ...m, planId,
                        mbps: plan ? (plan.mbps ?? '') : m.mbps,
                        mensualidad: plan ? plan.precio : m.mensualidad,
                      }));
                    }}>
                      <option value="">Sin plan</option>
                      {(planesQ.data || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Mbps">
                    <input type="number" style={campoInputStyle} value={modal.mbps} onChange={e => setModal({ ...modal, mbps: e.target.value })} />
                  </Campo>
                  <Campo label="Mensualidad (S/)">
                    <input type="number" step="0.01" style={campoInputStyle} value={modal.mensualidad} onChange={e => setModal({ ...modal, mensualidad: e.target.value })} />
                  </Campo>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', background: '#F8FAFC', border: '1px solid #E2ECF4', borderRadius: 8 }}>
                    <div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plan actual</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>
                        {(planesQ.data || []).find(p => p.id === modal.planId)?.nombre || 'Sin plan'}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mbps</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{modal.mbps || '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mensualidad</span>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{modal.mensualidad ? `S/ ${Number(modal.mensualidad).toFixed(2)}` : '—'}</div>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#7E9BB8' }}>
                    El plan solo se puede elegir/cambiar en órdenes de Instalación, Cambio de plan o Reconexión.
                  </p>
                </div>
              )}
              {requiereIp && (
                <div className="resp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <Campo label="IP WAN">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.ipWan} onChange={e => setModal({ ...modal, ipWan: e.target.value })} />
                  </Campo>
                  <Campo label="Máscara">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.mascara} onChange={e => setModal({ ...modal, mascara: e.target.value })} />
                  </Campo>
                  <Campo label="Gateway">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.gateway} onChange={e => setModal({ ...modal, gateway: e.target.value })} />
                  </Campo>
                </div>
              )}
              {requiereIp && (
                <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Campo label="Usuario PPPoE">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.pppoeUsuario} onChange={e => setModal({ ...modal, pppoeUsuario: e.target.value })} />
                  </Campo>
                  <Campo label="Contraseña PPPoE">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.pppoePassword} onChange={e => setModal({ ...modal, pppoePassword: e.target.value })} />
                  </Campo>
                </div>
              )}
              {requiereIp && (
                <p style={{ margin: '-8px 0 0', fontSize: 11.5, color: '#7E9BB8' }}>
                  La IP WAN y el usuario PPPoE deben ser únicos — si los cambias, se validan y se actualizan en el contrato al completar la orden.
                </p>
              )}

              <SeccionLabel>Asignación</SeccionLabel>
              <Campo label="Técnico">
                <select style={campoInputStyle} value={modal.tecnicoId} onChange={e => setModal({ ...modal, tecnicoId: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {(tecnicosQ.data || []).map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>)}
                </select>
              </Campo>
              <Campo label="Observación">
                <textarea rows={2} style={{ ...campoInputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical', fontFamily: 'inherit' }} value={modal.observacion} onChange={e => setModal({ ...modal, observacion: e.target.value })} />
              </Campo>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid #EEF2F6', marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22 }}>
              <Btn onClick={() => setModal(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
              <Btn disabled={!formValido || guardarM.isPending} loading={guardarM.isPending} onClick={() => guardarM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>
                {modal.id ? 'Guardar cambios' : 'Crear orden'}
              </Btn>
            </div>
          </>
        )}
      </Modal>

      <OrdenDrawer
        ordenId={drawerId}
        onCerrar={() => setDrawerId(null)}
        onEditar={(o) => { setDrawerId(null); abrirEditar(o); }}
      />
    </div>
  );
}
