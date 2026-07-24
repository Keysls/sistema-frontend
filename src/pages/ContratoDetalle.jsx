import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Fingerprint, Router, Wifi,
  Activity, Calendar, User, Clock, Copy, Radio, DollarSign, Pencil, MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contratosApi, empresaApi } from '../services/api';
import { Btn, Spinner, Badge } from '../components/ui';
import { tipoLabel } from '../utils/tiposOrden';
import { formatMetodosPagoTexto } from '../utils/metodosPago';

const CSS = `
  @keyframes cdet-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(63,185,80,0.5); }
    70%  { box-shadow: 0 0 0 8px rgba(63,185,80,0); }
    100% { box-shadow: 0 0 0 0 rgba(63,185,80,0); }
  }
  .cdet-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
`;
if (typeof document !== 'undefined' && !document.getElementById('cdet-css')) {
  const s = document.createElement('style'); s.id = 'cdet-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

const TIPOS_SERVICIO_LABEL = { INTERNET: 'Internet', CABLE: 'Cable', DUO: 'Dúo' };

const ESTADO_CONTRATO = {
  ACTIVO: { label: 'Activo', color: '#3fb950' },
  SUSPENDIDO: { label: 'Suspendido', color: '#e3b341' },
  CORTADO: { label: 'Cortado', color: '#ef4444' },
  BAJA: { label: 'Baja', color: '#768999' },
};

const ESTADO_ORDEN = {
  PENDIENTE: { label: 'Pendiente', color: '#e3b341' },
  ASIGNADA: { label: 'Asignada', color: '#3b9fd4' },
  EN_PROCESO: { label: 'En proceso', color: '#58a6ff' },
  COMPLETADA: { label: 'Completada', color: '#3fb950' },
  CANCELADA: { label: 'Cancelada', color: '#768999' },
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

function saldoCargo(cg) {
  return Number(cg.monto) - (cg.pagos || []).reduce((s, p) => s + Number(p.monto), 0);
}

function mensajeRecordatorio(c, metodosPago) {
  const pendientes = (c.cargos || []).filter(cg => cg.estado === 'PENDIENTE' || cg.estado === 'PARCIAL');
  const nombre = c.cliente?.nombres || 'cliente';
  if (pendientes.length === 0) {
    return `Hola ${nombre}, te saludamos de Prointelco. Tu contrato ${c.numero} está al día. ¡Gracias por tu preferencia!`;
  }
  const total = pendientes.reduce((s, cg) => s + saldoCargo(cg), 0);
  const meses = pendientes.map(cg => fmtPeriodo(cg.periodo)).join(', ');
  const diaCorte = c.diaCorte || 1;
  return `Hola ${nombre}, te saludamos de Prointelco. Tu contrato ${c.numero} tiene una deuda pendiente de S/ ${total.toFixed(2)} correspondiente a: ${meses}. Tu fecha de corte es el día ${diaCorte} de cada mes. Por favor regulariza tu pago para evitar el corte del servicio.${formatMetodosPagoTexto(metodosPago)}\n\n¡Gracias!`;
}

function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--txt)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
      {icon}{title}
    </div>
  );
}

function SubSeccion({ label }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      {label}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function Field({ icon, label, value, mono, onCopy }) {
  return (
    <div onClick={onCopy || undefined} style={{
      background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
      position: 'relative', cursor: onCopy ? 'pointer' : 'default', transition: 'background .12s',
    }}
    onMouseEnter={onCopy ? (e) => e.currentTarget.style.background = 'var(--bg-2)' : undefined}
    onMouseLeave={onCopy ? (e) => e.currentTarget.style.background = 'var(--bg-3)' : undefined}>
      <div style={{ fontSize: 10, color: 'var(--txt-3)', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--txt)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', wordBreak: 'break-word' }}>
        {value}
      </div>
      {onCopy && <Copy size={11} style={{ position: 'absolute', top: 8, right: 8, color: 'var(--txt-3)', opacity: 0.4 }} />}
    </div>
  );
}

export default function ContratoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: c, isLoading, error } = useQuery({
    queryKey: ['contrato', id],
    queryFn: () => contratosApi.obtener(id).then(r => r.data),
    enabled: !!id,
    staleTime: 15000,
  });

  const empresaQ = useQuery({ queryKey: ['empresa'], queryFn: () => empresaApi.obtener().then(r => r.data) });
  const metodosPago = empresaQ.data?.metodosPago || [];

  const copiar = (text, label = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  if (isLoading) {
    return (
      <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spinner size={28} />
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 28, color: 'var(--red)', fontSize: 14 }}>
        Error: {error?.response?.data?.error || error.message}
      </div>
    );
  }
  if (!c) return null;

  const cfg = ESTADO_CONTRATO[c.estado] || { label: c.estado, color: '#768999' };
  const pulsa = c.estado === 'ACTIVO';
  const abonado = `${c.cliente?.nombres || ''} ${c.cliente?.apellidos || ''}`.trim();
  const ordenesOrdenadas = [...(c.ordenes || [])].sort((a, b) => new Date(b.fechaServicio) - new Date(a.fechaServicio));

  return (
    <div style={{ padding: 28 }} className="animate-fade">

      <Btn variant="ghost" size="sm" onClick={() => navigate('/contratos')} icon={<ArrowLeft size={13} />}>
        Volver a contratos
      </Btn>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginTop: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
            <h1
              onClick={() => copiar(c.numero, 'Contrato copiado')}
              title="Click para copiar"
              style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--blue)', cursor: 'pointer', margin: 0, letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {c.numero}
              <Copy size={14} style={{ opacity: 0.5 }} />
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', background: cfg.color + '18', color: cfg.color }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, animation: pulsa ? 'cdet-pulse 1.5s ease-in-out infinite' : 'none' }} />
              {cfg.label}
            </span>
            <Badge color="blue">{TIPOS_SERVICIO_LABEL[c.tipoServicio]}</Badge>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt)' }}>{abonado}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {c.puntoRed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border-2)', fontSize: 12, color: 'var(--txt-2)' }}>
              <Radio size={14} /> {c.puntoRed.codigo} ({c.puntoRed.tipo})
            </div>
          )}
          {c.cliente?.telefono && (
            <a href={linkWhatsapp(c.cliente.telefono, mensajeRecordatorio(c, metodosPago))} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-2)', fontSize: 12, fontWeight: 600, color: '#16A34A', textDecoration: 'none' }}>
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
          <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => navigate('/contratos', { state: { editar: c.id } })}>
            Editar
          </Btn>
        </div>
      </div>

      {/* Datos del cliente / ubicación */}
      <div style={{ display: 'grid', gap: 10, marginBottom: 16 }} className="cdet-grid">
        <Field icon={<Fingerprint size={12} />} label="DNI/RUC" value={c.cliente?.dniRuc || '—'} mono onCopy={c.cliente?.dniRuc ? () => copiar(c.cliente.dniRuc, 'DNI/RUC copiado') : null} />
        <Field icon={<Phone size={12} />} label="Celular" value={c.cliente?.telefono || '—'} mono onCopy={c.cliente?.telefono ? () => copiar(c.cliente.telefono, 'Celular copiado') : null} />
        <Field icon={<MapPin size={12} />} label="Dirección" value={c.direccion} onCopy={() => copiar(c.direccion, 'Dirección copiada')} />
        <Field icon={<MapPin size={12} />} label="Referencia" value={c.referencia || '—'} />
        <Field icon={<MapPin size={12} />} label="Sector" value={c.sector || '—'} />
        {c.precinto && <Field icon={<MapPin size={12} />} label="Precinto" value={c.precinto} mono onCopy={() => copiar(c.precinto, 'Precinto copiado')} />}
        <Field icon={<Wifi size={12} />} label="Plan" value={c.plan ? `${c.plan.nombre}${c.mbps ? ` (${c.mbps} Mbps)` : ''}` : (c.mbps ? `${c.mbps} Mbps` : '—')} />
        {c.costoMensual != null && <Field icon={<DollarSign size={12} />} label="Mensualidad" value={`S/ ${Number(c.costoMensual).toFixed(2)}`} />}
        <Field icon={<Calendar size={12} />} label="Registrado" value={fmtFecha(c.createdAt)} />
      </div>

      {/* Equipo actual */}
      {(c.equipoProducto || c.equipoSerie || c.tecnicoInstalador || c.ipWan || c.pppoeUsuario) && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader icon={<Router size={15} />} title="Equipo e instalación" />
          <div style={{ padding: '14px 16px' }}>

            <SubSeccion label="Instalación" />
            <div style={{ display: 'grid', gap: 10 }} className="cdet-grid">
              <Field icon={<Calendar size={11} />} label="Instalado" value={fmtFecha(c.fechaInstalacion)} />
              {c.equipoProducto && <Field label="Equipo" value={c.equipoProducto.nombre} />}
              {c.equipoSerie && <Field label="N° serie / MAC" value={c.equipoSerie} mono onCopy={() => copiar(c.equipoSerie, 'Serie copiada')} />}
              {c.tecnicoInstalador && <Field icon={<User size={11} />} label="Técnico" value={`${c.tecnicoInstalador.nombre} ${c.tecnicoInstalador.apellido}`} />}
            </div>

            {(c.ipWan || c.mascara || c.gateway) && (
              <>
                <SubSeccion label="Red" />
                <div style={{ display: 'grid', gap: 10 }} className="cdet-grid">
                  <Field label="IP WAN" value={c.ipWan || '—'} mono onCopy={c.ipWan ? () => copiar(c.ipWan, 'IP copiada') : null} />
                  <Field label="Máscara" value={c.mascara || '—'} mono />
                  <Field label="Gateway" value={c.gateway || '—'} mono onCopy={c.gateway ? () => copiar(c.gateway, 'Gateway copiado') : null} />
                </div>
              </>
            )}

            {(c.pppoeUsuario || c.pppoePassword) && (
              <>
                <SubSeccion label="PPPoE" />
                <div style={{ display: 'grid', gap: 10 }} className="cdet-grid">
                  <Field label="Usuario" value={c.pppoeUsuario || '—'} mono onCopy={c.pppoeUsuario ? () => copiar(c.pppoeUsuario, 'Usuario copiado') : null} />
                  <Field label="Contraseña" value={c.pppoePassword || '—'} mono onCopy={c.pppoePassword ? () => copiar(c.pppoePassword, 'Contraseña copiada') : null} />
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Historial de deuda y pagos */}
      {c.cargos?.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader icon={<DollarSign size={15} />} title={`Historial de deuda y pagos (${c.cargos.length})`} />
          <div style={{ padding: '4px 16px 8px' }}>
            {c.cargos.map((cg, i) => {
              const pagado = cg.estado === 'PAGADO';
              const parcial = cg.estado === 'PARCIAL';
              const pagoInfo = cg.pagos?.[cg.pagos.length - 1]?.pago;
              const saldo = saldoCargo(cg);
              const ultima = i === c.cargos.length - 1;
              return (
                <div key={cg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: ultima ? 'none' : '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{fmtPeriodo(cg.periodo)}</div>
                    {pagado && pagoInfo && (
                      <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 2 }}>
                        Pagado el {fmtFecha(pagoInfo.fecha)} · {pagoInfo.usuario?.nombre} {pagoInfo.usuario?.apellido}
                      </div>
                    )}
                    {parcial && (
                      <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                        Abonado S/ {(Number(cg.monto) - saldo).toFixed(2)} · falta S/ {saldo.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>S/ {Number(cg.monto).toFixed(2)}</span>
                  <Badge color={pagado ? 'green' : parcial ? 'yellow' : 'red'}>{pagado ? 'Pagado' : parcial ? 'Parcial' : 'Pendiente'}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Timeline órdenes */}
      <Card>
        <CardHeader icon={<Activity size={15} />} title={`Historial de órdenes (${ordenesOrdenadas.length})`} />
        <div style={{ padding: '8px 16px 16px' }}>
          {ordenesOrdenadas.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
              Sin órdenes registradas
            </div>
          ) : (
            <div>
              {ordenesOrdenadas.map((o, i) => {
                const eCfg = ESTADO_ORDEN[o.estado] || { label: o.estado, color: '#768999' };
                const ultima = i === ordenesOrdenadas.length - 1;
                const enProc = o.estado === 'EN_PROCESO';
                return (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 4px', borderBottom: ultima ? 'none' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: eCfg.color, boxShadow: `0 0 0 3px ${eCfg.color}30`, animation: enProc ? 'cdet-pulse 1.5s ease-in-out infinite' : 'none' }} />
                      {!ultima && <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 22 }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--txt)', fontSize: 13 }}>{tipoLabel(o.tipoOrden)}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--blue)' }}>{o.nServicio}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', background: eCfg.color + '18', color: eCfg.color }}>
                          {eCfg.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--txt-3)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {fmtFecha(o.fechaServicio)}</span>
                        {o.tecnico && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} /> {o.tecnico.nombre} {o.tecnico.apellido}</span>}
                        {o.tiempoInstalacion != null && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {Math.round(o.tiempoInstalacion)} min</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
