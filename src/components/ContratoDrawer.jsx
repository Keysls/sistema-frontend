import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, User, Clock, Copy, Pencil, FileText, ExternalLink, MessageCircle, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { contratosApi, empresaApi } from '../services/api';
import { Spinner, Badge } from './ui';
import { tipoLabel } from '../utils/tiposOrden';
import { formatMetodosPagoTexto } from '../utils/metodosPago';

const TIPOS_SERVICIO_LABEL = { INTERNET: 'Internet', CABLE: 'Cable', DUO: 'Dúo' };

const ESTADO_CONTRATO = {
  ACTIVO: { label: 'Activo', color: '#16A34A' },
  SUSPENDIDO: { label: 'Suspendido', color: '#D97706' },
  CORTADO: { label: 'Cortado', color: '#DC2626' },
  BAJA: { label: 'Baja', color: '#5A7A9A' },
};

const ESTADO_ORDEN = {
  PENDIENTE: { label: 'Pendiente', color: '#D97706' },
  ASIGNADA: { label: 'Asignada', color: '#3B9FD4' },
  EN_PROCESO: { label: 'En proceso', color: '#2563EB' },
  COMPLETADA: { label: 'Completada', color: '#16A34A' },
  CANCELADA: { label: 'Cancelada', color: '#94A3B8' },
};

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtPeriodo(periodo) {
  const [anio, mes] = periodo.split('-');
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${nombres[Number(mes) - 1]} ${anio}`;
}

function linkWhatsapp(telefono, mensaje) {
  const digitos = (telefono || '').replace(/\D/g, '');
  const conCodigo = digitos.length === 9 ? `51${digitos}` : digitos;
  return `https://wa.me/${conCodigo}?text=${encodeURIComponent(mensaje)}`;
}

function mensajeRecordatorio(c, metodosPago) {
  const pendientes = (c.cargos || []).filter(cg => cg.estado === 'PENDIENTE');
  const nombre = c.cliente?.nombres || 'cliente';
  if (pendientes.length === 0) {
    return `Hola ${nombre}, te saludamos de Prointelco. Tu contrato ${c.numero} está al día. ¡Gracias por tu preferencia!`;
  }
  const total = pendientes.reduce((s, cg) => s + Number(cg.monto), 0);
  const meses = pendientes.map(cg => fmtPeriodo(cg.periodo)).join(', ');
  const diaCorte = c.diaCorte || 1;
  return `Hola ${nombre}, te saludamos de Prointelco. Tu contrato ${c.numero} tiene una deuda pendiente de S/ ${total.toFixed(2)} correspondiente a: ${meses}. Tu fecha de corte es el día ${diaCorte} de cada mes. Por favor regulariza tu pago para evitar el corte del servicio.${formatMetodosPagoTexto(metodosPago)}\n\n¡Gracias!`;
}

export default function ContratoDrawer({ contratoId, onCerrar, onEditar }) {
  const navigate = useNavigate();
  const abierto = Boolean(contratoId);

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  const { data: c, isLoading, error } = useQuery({
    queryKey: ['contrato', contratoId],
    queryFn: () => contratosApi.obtener(contratoId).then(r => r.data),
    enabled: abierto,
    staleTime: 15000,
  });

  const empresaQ = useQuery({ queryKey: ['empresa'], queryFn: () => empresaApi.obtener().then(r => r.data), enabled: abierto });
  const metodosPago = empresaQ.data?.metodosPago || [];

  const copiar = (text, label = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const cfg = c ? (ESTADO_CONTRATO[c.estado] || { label: c.estado, color: '#94A3B8' }) : null;
  const inicial = c?.cliente?.nombres?.[0]?.toUpperCase() || '?';

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
            <div style={{ color: 'var(--red)', fontSize: 14, marginTop: 16 }}>
              Error: {error?.response?.data?.error || error.message}
            </div>
          </div>
        ) : c ? (
          <>
            <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  {inicial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.cliente?.nombres} {c.cliente?.apellidos}
                  </div>
                  <div
                    onClick={() => copiar(c.numero, 'N° de contrato copiado')}
                    title="Click para copiar"
                    style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2, fontFamily: 'var(--font-mono)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {c.numero} <Copy size={11} style={{ opacity: 0.5 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {c.cliente?.telefono && (
                    <a
                      href={linkWhatsapp(c.cliente.telefono, mensajeRecordatorio(c, metodosPago))}
                      target="_blank" rel="noopener noreferrer"
                      title="Enviar recordatorio por WhatsApp"
                      style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-2)', cursor: 'pointer', color: '#16A34A', textDecoration: 'none' }}>
                      <MessageCircle size={14} />
                    </a>
                  )}
                  <button onClick={() => { onCerrar(); navigate(`/contratos/${c.id}`); }} title="Ver ficha completa" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-2)', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    <ExternalLink size={14} />
                  </button>
                  <button onClick={() => onEditar(c)} title="Editar contrato" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-2)', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={onCerrar} title="Cerrar" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-2)', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: cfg.color + '18', color: cfg.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
                  {cfg.label}
                </span>
                <Badge color="blue">{TIPOS_SERVICIO_LABEL[c.tipoServicio]}</Badge>
                {c.puntoRed && <Badge color="blue">{c.puntoRed.codigo}</Badge>}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>

              <div style={{ background: 'var(--bg-card)', margin: '12px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Datos del contrato</span>
                </div>
                <div style={{ padding: '0 16px' }}>
                  <FilaDato label="DNI/RUC" value={c.cliente?.dniRuc || '—'} mono onCopy={c.cliente?.dniRuc ? () => copiar(c.cliente.dniRuc, 'DNI/RUC copiado') : null} />
                  <FilaDato label="Celular" value={c.cliente?.telefono || '—'} mono />
                  <FilaDato label="Dirección" value={c.direccion} onCopy={() => copiar(c.direccion, 'Dirección copiada')} />
                  {c.referencia && <FilaDato label="Referencia" value={c.referencia} />}
                  {c.sector && <FilaDato label="Sector" value={c.sector} />}
                  {c.precinto && <FilaDato label="Precinto" value={c.precinto} mono onCopy={() => copiar(c.precinto, 'Precinto copiado')} />}
                  <FilaDato label="Plan" value={c.plan ? `${c.plan.nombre}${c.mbps ? ` (${c.mbps} Mbps)` : ''}` : (c.mbps ? `${c.mbps} Mbps` : '—')} />
                  {c.costoMensual != null && <FilaDato label="Mensualidad" value={`S/ ${Number(c.costoMensual).toFixed(2)}`} />}
                  {c.tipoServicio !== 'CABLE' && (
                    <>
                      {c.ipWan && <FilaDato label="IP WAN" value={c.ipWan} mono onCopy={() => copiar(c.ipWan, 'IP copiada')} />}
                      {c.gateway && <FilaDato label="Gateway" value={c.gateway} mono onCopy={() => copiar(c.gateway, 'Gateway copiado')} />}
                    </>
                  )}
                  <FilaDato label="Registrado" value={fmtFecha(c.createdAt)} last />
                </div>
              </div>

              {(c.equipoProducto || c.equipoSerie || c.tecnicoInstalador) && (
                <div style={{ background: 'var(--bg-card)', margin: '10px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Equipo e instalación</span>
                  </div>
                  <div style={{ padding: '0 16px' }}>
                    {c.equipoProducto && <FilaDato label="Equipo" value={c.equipoProducto.nombre} />}
                    {c.equipoSerie && <FilaDato label="N° serie / MAC" value={c.equipoSerie} mono onCopy={() => copiar(c.equipoSerie, 'Serie copiada')} />}
                    {c.tecnicoInstalador && <FilaDato label="Técnico" value={`${c.tecnicoInstalador.nombre} ${c.tecnicoInstalador.apellido}`} />}
                    <FilaDato label="Fecha instalación" value={fmtFecha(c.fechaInstalacion)} last />
                  </div>
                </div>
              )}

              {c.cargos?.length > 0 && (
                <div style={{ background: 'var(--bg-card)', margin: '10px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <DollarSign size={13} style={{ color: 'var(--txt-3)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Historial de deuda y pagos ({c.cargos.length})</span>
                    </div>
                  </div>
                  <div>
                    {c.cargos.map((cg, i) => {
                      const pagado = cg.estado === 'PAGADO';
                      const pagoInfo = cg.pagos?.[0]?.pago;
                      const ultima = i === c.cargos.length - 1;
                      return (
                        <div key={cg.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: ultima ? 'none' : '1px solid var(--border)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{fmtPeriodo(cg.periodo)}</div>
                            {pagado && pagoInfo && (
                              <div style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 1 }}>
                                Pagado {fmtFecha(pagoInfo.fecha)} · {pagoInfo.usuario?.nombre}
                              </div>
                            )}
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--txt)' }}>S/ {Number(cg.monto).toFixed(2)}</span>
                          <Badge color={pagado ? 'green' : 'yellow'}>{pagado ? 'Pagado' : 'Pendiente'}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--bg-card)', margin: '10px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <FileText size={13} style={{ color: 'var(--txt-3)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Historial de órdenes ({c.ordenes.length})</span>
                  </div>
                </div>

                {c.ordenes.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin órdenes registradas</div>
                ) : (
                  <div>
                    {c.ordenes.map((o, i) => {
                      const eCfg = ESTADO_ORDEN[o.estado] || { label: o.estado, color: '#94A3B8' };
                      const ultima = i === c.ordenes.length - 1;
                      return (
                        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: ultima ? 'none' : '1px solid var(--border)' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: eCfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={14} color={eCfg.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{tipoLabel(o.tipoOrden)}</span>
                              <span style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>{o.nServicio}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--txt-3)', flexWrap: 'wrap' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10} /> {fmtFecha(o.fechaServicio)}</span>
                              {o.tecnico && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={10} /> {o.tecnico.nombre} {o.tecnico.apellido}</span>}
                              {o.tiempoInstalacion != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {o.tiempoInstalacion} min</span>}
                            </div>
                          </div>
                          <span style={{ padding: '3px 8px', borderRadius: 5, flexShrink: 0, fontSize: 10, fontWeight: 700, background: eCfg.color + '18', color: eCfg.color }}>
                            {eCfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ height: 16 }} />
            </div>
          </>
        ) : null}
      </aside>
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
