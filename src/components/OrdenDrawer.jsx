import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Pencil, Calendar, Copy, UserCheck, Play, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordenesApi, tecnicosApi, puntosRedApi, productosApi, cargosApi } from '../services/api';
import { Spinner, Badge, Btn, Modal } from './ui';
import { tipoLabel } from '../utils/tiposOrden';

const inputMini = {
  height: 34, padding: '0 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)',
  borderRadius: 8, color: 'var(--txt)', fontSize: 12, outline: 'none', boxSizing: 'border-box', width: '100%',
};

const ESTADO_ORDEN = {
  PENDIENTE: { label: 'Pendiente', color: 'yellow' },
  ASIGNADA: { label: 'Asignada', color: 'blue' },
  EN_PROCESO: { label: 'En proceso', color: 'blue' },
  COMPLETADA: { label: 'Completada', color: 'green' },
  CANCELADA: { label: 'Cancelada', color: 'red' },
};

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtFechaHora(f) {
  if (!f) return '—';
  return new Date(f).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtPeriodo(p) {
  const [anio, mes] = p.split('-').map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

function ModalMesesSaltados({ data, onClose, onResuelto }) {
  const [seleccionados, setSeleccionados] = useState(new Set());

  useEffect(() => {
    if (data) setSeleccionados(new Set(data.periodos));
  }, [data]);

  const cobrarM = useMutation({
    mutationFn: () => cargosApi.generarSaltados({ contratoId: data.contratoId, periodos: Array.from(seleccionados) }),
    onSuccess: (res) => {
      toast.success(`${res.data.creados} mes(es) cobrado(s)`);
      onResuelto();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo generar el cobro'),
  });

  const descartarM = useMutation({
    mutationFn: () => cargosApi.descartarSaltados(data.contratoId),
    onSuccess: () => { toast.success('No se cobrarán esos meses'); onResuelto(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo descartar'),
  });

  if (!data) return null;

  return (
    <Modal open={Boolean(data)} onClose={onClose} title="Reconexión: meses sin cobrar" width={460}>
      <p style={{ fontSize: 13, color: 'var(--txt-3)', marginTop: 0 }}>
        Este contrato estuvo cortado y estos meses nunca se facturaron. ¿Quieres cobrarlos ahora?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {data.periodos.map(p => (
          <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1px solid var(--border-2)', borderRadius: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={seleccionados.has(p)}
              onChange={(e) => setSeleccionados(prev => {
                const next = new Set(prev);
                if (e.target.checked) next.add(p); else next.delete(p);
                return next;
              })}
            />
            <span style={{ flex: 1, fontSize: 13, textTransform: 'capitalize' }}>{fmtPeriodo(p)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>S/ {Number(data.monto).toFixed(2)}</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <Btn variant="ghost" disabled={descartarM.isPending} onClick={() => descartarM.mutate()}>No cobrar ninguno</Btn>
        <Btn disabled={cobrarM.isPending || seleccionados.size === 0} onClick={() => cobrarM.mutate()}>
          Cobrar {seleccionados.size} mes{seleccionados.size !== 1 ? 'es' : ''}
        </Btn>
      </div>
    </Modal>
  );
}

export default function OrdenDrawer({ ordenId, onCerrar, onEditar }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const abierto = Boolean(ordenId);
  const [tecnicoElegido, setTecnicoElegido] = useState('');
  const [instalacion, setInstalacion] = useState({ puntoRedId: '', equipoProductoId: '', equipoSerie: '', fechaInstalacion: new Date().toISOString().slice(0, 10) });
  const [saltados, setSaltados] = useState(null);

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  const { data: o, isLoading, error } = useQuery({
    queryKey: ['orden', ordenId],
    queryFn: () => ordenesApi.obtener(ordenId).then(r => r.data),
    enabled: abierto,
    staleTime: 15000,
  });

  const tecnicosQ = useQuery({ queryKey: ['tecnicos-select'], queryFn: () => tecnicosApi.listar().then(r => r.data), enabled: abierto });
  const esInstalacion = o?.tipoOrden?.startsWith('INSTALACION');
  const requiereInstalacion = Boolean(esInstalacion && ['PENDIENTE', 'ASIGNADA', 'EN_PROCESO'].includes(o?.estado) && o?.contrato);

  const puntosQ = useQuery({ queryKey: ['puntos-red-mapa'], queryFn: () => puntosRedApi.listar().then(r => r.data), enabled: abierto && requiereInstalacion });
  const catalogoQ = useQuery({ queryKey: ['productos-catalogo-completo'], queryFn: () => productosApi.catalogo({ limit: 1000 }).then(r => r.data.data), enabled: abierto && requiereInstalacion });

  const cambiarEstadoM = useMutation({
    mutationFn: ({ estado, tecnicoId, ...resto }) => ordenesApi.cambiarEstado(ordenId, { estado, tecnicoId, ...resto }),
    onSuccess: async (_res, variables) => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['ordenes-servicio'] });
      qc.invalidateQueries({ queryKey: ['orden', ordenId] });
      qc.invalidateQueries({ queryKey: ['contratos'] });
      setTecnicoElegido('');

      if (variables.estado === 'COMPLETADA' && o?.tipoOrden?.startsWith('RECONEXION') && o?.contratoId) {
        try {
          const { data } = await cargosApi.mesesSaltados(o.contratoId);
          if (data?.periodos?.length) setSaltados({ contratoId: o.contratoId, periodos: data.periodos, monto: data.monto });
        } catch { /* silencioso: no bloquea el flujo si falla el chequeo */ }
      }
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo cambiar el estado'),
  });

  const completarConInstalacion = () => {
    // El equipo (ONU/decodificador) es opcional — no toda instalación deja un
    // equipo físico (ej. cable directo). Solo se pide el punto de red.
    if (requiereInstalacion && !instalacion.puntoRedId) {
      toast.error('Selecciona el punto de red');
      return;
    }
    cambiarEstadoM.mutate({ estado: 'COMPLETADA', ...(requiereInstalacion ? instalacion : {}) });
  };

  const copiar = (text, label = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const cfg = o ? (ESTADO_ORDEN[o.estado] || { label: o.estado, color: 'blue' }) : null;

  return createPortal(
    <>
      {abierto && (
        <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)', zIndex: 9998 }} />
      )}

      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '100vw',
        background: 'var(--bg)', zIndex: 9999, boxShadow: '-2px 0 32px rgba(15,23,42,0.15)',
        transform: abierto ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {!abierto ? null : isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
            <Spinner size={26} />
          </div>
        ) : error ? (
          <div style={{ padding: 24, background: 'var(--bg-card)', height: '100%' }}>
            <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}><X size={18} /></button>
            <div style={{ color: 'var(--red)', fontSize: 14, marginTop: 16 }}>Error: {error?.response?.data?.error || error.message}</div>
          </div>
        ) : o ? (
          <>
            <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: 'var(--blue)' }}>{o.nServicio}</span>
                    <Badge color={cfg.color}>{cfg.label}</Badge>
                    <Badge color="blue">{tipoLabel(o.tipoOrden)}</Badge>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>{o.abonado}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 2 }}>
                    {fmtFecha(o.fechaServicio)}{o.tecnico && ` · ${o.tecnico.nombre} ${o.tecnico.apellido}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => onEditar(o)} title="Editar orden" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-2)', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={onCerrar} title="Cerrar" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-2)', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>

              <div style={{ background: 'var(--bg-card)', margin: '12px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Datos del servicio</span>
                </div>
                <div style={{ padding: '0 16px' }}>
                  {o.dni && <FilaDato label="DNI" value={o.dni} mono />}
                  {o.contrato && <FilaDato label="Contrato" value={o.contrato.numero} mono onCopy={() => copiar(o.contrato.numero, 'Contrato copiado')} />}
                  {o.celular && <FilaDato label="Celular" value={o.celular} mono />}
                  <FilaDato label="Dirección" value={o.direccion} onCopy={() => copiar(o.direccion, 'Dirección copiada')} />
                  {o.referencia && <FilaDato label="Referencia" value={o.referencia} />}
                  {o.sector && <FilaDato label="Sector" value={o.sector} />}
                  {(o.plan || o.mbps) && <FilaDato label="Plan" value={`${o.plan?.nombre || ''}${o.mbps ? ` (${o.mbps} Mbps)` : ''}`} />}
                  {o.mensualidad != null && <FilaDato label="Mensualidad" value={`S/ ${Number(o.mensualidad).toFixed(2)}`} />}
                  <FilaDato label="Fecha servicio" value={fmtFecha(o.fechaServicio)} last={!o.observacion} />
                  {o.observacion && (
                    <div style={{ margin: '8px 0', padding: '8px 12px', background: 'var(--yellow-bg)', borderRadius: 8, border: '1px solid var(--yellow)', fontSize: 12, color: 'var(--yellow)' }}>
                      {o.observacion}
                    </div>
                  )}
                </div>
              </div>

              {(o.ipWan || o.mascara || o.gateway) && (
                <div style={{ background: 'var(--bg-card)', margin: '10px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Red</span>
                  </div>
                  <div style={{ padding: '0 16px' }}>
                    <FilaDato label="IP WAN" value={o.ipWan || '—'} mono onCopy={o.ipWan ? () => copiar(o.ipWan, 'IP copiada') : null} />
                    <FilaDato label="Máscara" value={o.mascara || '—'} mono />
                    <FilaDato label="Gateway" value={o.gateway || '—'} mono onCopy={o.gateway ? () => copiar(o.gateway, 'Gateway copiado') : null} last />
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--bg-card)', margin: '10px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Seguimiento</span>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {o.fechaAsignacion && <div style={{ fontSize: 12, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={11} /> Asignada: {fmtFechaHora(o.fechaAsignacion)}</div>}
                  {o.fechaInicio && <div style={{ fontSize: 12, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={11} /> Iniciada: {fmtFechaHora(o.fechaInicio)}</div>}
                  {o.fechaFin && <div style={{ fontSize: 12, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={11} /> Completada: {fmtFechaHora(o.fechaFin)}</div>}

                  {o.estado === 'PENDIENTE' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      <select value={tecnicoElegido} onChange={e => setTecnicoElegido(e.target.value)}
                        style={{ flex: 1, height: 36, padding: '0 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12 }}>
                        <option value="">Selecciona un técnico...</option>
                        {(tecnicosQ.data || []).map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>)}
                      </select>
                      <Btn size="sm" icon={<UserCheck size={13} />} disabled={!tecnicoElegido || cambiarEstadoM.isPending}
                        onClick={() => cambiarEstadoM.mutate({ estado: 'ASIGNADA', tecnicoId: tecnicoElegido })}>
                        Asignar
                      </Btn>
                    </div>
                  )}
                  {o.estado === 'ASIGNADA' && (
                    <Btn size="sm" icon={<Play size={13} />} disabled={cambiarEstadoM.isPending} onClick={() => cambiarEstadoM.mutate({ estado: 'EN_PROCESO' })}>
                      Iniciar trabajo
                    </Btn>
                  )}
                  {['PENDIENTE', 'ASIGNADA', 'EN_PROCESO'].includes(o.estado) && (
                    <>
                      {requiereInstalacion && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Datos de instalación</span>
                          <select style={inputMini} value={instalacion.puntoRedId} onChange={e => setInstalacion({ ...instalacion, puntoRedId: e.target.value })}>
                            <option value="">Punto de red (NAP/CTO)...</option>
                            {(puntosQ.data || []).map(p => <option key={p.id} value={p.id}>{p.codigo} ({p.tipo})</option>)}
                          </select>
                          <select style={inputMini} value={instalacion.equipoProductoId} onChange={e => setInstalacion({ ...instalacion, equipoProductoId: e.target.value })}>
                            <option value="">Equipo instalado...</option>
                            {(catalogoQ.data || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                          </select>
                          <input style={inputMini} placeholder="N° serie / MAC" value={instalacion.equipoSerie} onChange={e => setInstalacion({ ...instalacion, equipoSerie: e.target.value })} />
                          <input type="date" style={inputMini} value={instalacion.fechaInstalacion} onChange={e => setInstalacion({ ...instalacion, fechaInstalacion: e.target.value })} />
                        </div>
                      )}
                      <Btn size="sm" icon={<CheckCircle2 size={13} />} style={{ background: '#16A34A' }} disabled={cambiarEstadoM.isPending} onClick={completarConInstalacion}>
                        Completar orden
                      </Btn>
                    </>
                  )}
                  {['PENDIENTE', 'ASIGNADA', 'EN_PROCESO'].includes(o.estado) && (
                    <Btn size="sm" variant="danger" icon={<XCircle size={13} />} disabled={cambiarEstadoM.isPending}
                      onClick={() => { if (confirm('¿Cancelar esta orden?')) cambiarEstadoM.mutate({ estado: 'CANCELADA' }); }}>
                      Cancelar orden
                    </Btn>
                  )}
                </div>
              </div>

              <div style={{ height: 16 }} />
            </div>
          </>
        ) : null}
      </aside>
      <ModalMesesSaltados
        data={saltados}
        onClose={() => setSaltados(null)}
        onResuelto={() => { setSaltados(null); qc.invalidateQueries({ queryKey: ['contratos'] }); }}
      />
    </>,
    document.body
  );
}

function FilaDato({ label, value, mono, onCopy, last }) {
  return (
    <div onClick={onCopy || undefined} style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--border)', cursor: onCopy ? 'pointer' : 'default', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--txt-3)', minWidth: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--txt)', fontWeight: 500, fontFamily: mono ? 'var(--font-mono)' : 'inherit', wordBreak: 'break-word' }}>{value}</span>
      {onCopy && <Copy size={11} style={{ color: 'var(--txt-3)', opacity: 0.5, flexShrink: 0 }} />}
    </div>
  );
}
