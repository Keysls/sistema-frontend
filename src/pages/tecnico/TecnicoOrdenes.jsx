import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, User, ChevronRight, ChevronDown, Phone, MessageCircle, Navigation, Package, Fingerprint } from 'lucide-react';
import { tecnicoOrdenesApi } from '../../services/tecnicoApi';
import { tipoLabelConServicio } from '../../utils/tiposOrden';

function linkWhatsapp(telefono) {
  const digitos = (telefono || '').replace(/\D/g, '');
  const conCodigo = digitos.length === 9 ? `51${digitos}` : digitos;
  return `https://wa.me/${conCodigo}`;
}

function linkMapaExterno(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const ESTADO_CFG = {
  PENDIENTE: { label: 'Pendiente', color: '#D97706', bg: '#FEF3C7' },
  ASIGNADA: { label: 'Asignada', color: '#3B9FD4', bg: '#EFF6FF' },
  EN_PROCESO: { label: 'En proceso', color: '#2563EB', bg: '#EFF6FF' },
  COMPLETADA: { label: 'Completada', color: '#16A34A', bg: '#F0FDF4' },
  CANCELADA: { label: 'Cancelada', color: '#94A3B8', bg: '#F1F5F9' },
};

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtFechaHora(f) {
  if (!f) return '—';
  return new Date(f).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function BtnIcono({ href, color, bg, border, children, onClick }) {
  return (
    <a
      href={href} target={href?.startsWith('tel:') ? undefined : '_blank'} rel="noreferrer"
      onClick={e => { e.stopPropagation(); if (onClick) onClick(e); }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${border}`,
        background: bg, color, fontSize: 11, fontWeight: 700, textDecoration: 'none',
      }}
    >
      {children}
    </a>
  );
}

function OrdenCard({ o, onClick }) {
  const cfg = ESTADO_CFG[o.estado] || { label: o.estado, color: '#94A3B8', bg: '#F1F5F9' };
  const lat = o.latitud ?? o.contrato?.latitud;
  const lng = o.longitud ?? o.contrato?.longitud;
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E2ECF4', padding: '14px 16px',
      marginBottom: 10, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#1E3A8A' }}>{o.nServicio}</span>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1B2A', marginBottom: 2 }}>{o.abonado}</div>
      <div style={{ fontSize: 12, color: '#3B9FD4', fontWeight: 600, marginBottom: 6 }}>{tipoLabelConServicio(o.tipoOrden)}</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 12, color: '#5A7A9A', marginBottom: 8 }}>
        <MapPin size={13} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>{o.direccion}</span>
      </div>

      {(o.celular || lat) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {o.celular && (
            <BtnIcono href={`tel:${o.celular}`} color="#1E3A5F" bg="#F4F8FC" border="#E2ECF4">
              <Phone size={13} /> Llamar
            </BtnIcono>
          )}
          {o.celular && (
            <BtnIcono href={linkWhatsapp(o.celular)} color="#16A34A" bg="#F0FDF4" border="#BBF7D0">
              <MessageCircle size={13} /> WhatsApp
            </BtnIcono>
          )}
          {lat && (
            <BtnIcono href={linkMapaExterno(lat, lng)} color="#2563EB" bg="#EFF6FF" border="#BFDBFE">
              <Navigation size={13} /> Mapa
            </BtnIcono>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#8AAABB' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {fmtFecha(o.fechaServicio)}</span>
          {o.tecnico && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} /> {o.tecnico.nombre}</span>}
        </div>
        <ChevronRight size={16} color="#8AAABB" />
      </div>
    </div>
  );
}

function FilaDetalle({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
      {icon}
      <span style={{ fontSize: 11, color: '#8AAABB', minWidth: 74, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: '#0D1B2A', fontWeight: 500, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function OrdenCardHistorial({ o }) {
  const [abierto, setAbierto] = useState(false);
  const cfg = ESTADO_CFG[o.estado] || { label: o.estado, color: '#94A3B8', bg: '#F1F5F9' };
  const lat = o.latitud ?? o.contrato?.latitud;
  const lng = o.longitud ?? o.contrato?.longitud;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2ECF4', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div onClick={() => setAbierto(v => !v)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#1E3A8A' }}>{o.nServicio}</span>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1B2A', marginBottom: 2 }}>{o.abonado}</div>
        <div style={{ fontSize: 12, color: '#3B9FD4', fontWeight: 600, marginBottom: 6 }}>{tipoLabelConServicio(o.tipoOrden)}</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 12, color: '#5A7A9A' }}>
          <MapPin size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{o.direccion}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#8AAABB' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {fmtFecha(o.fechaServicio)}</span>
            {o.tecnico && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={11} /> {o.tecnico.nombre}</span>}
          </div>
          <ChevronDown size={16} color="#8AAABB" style={{ transition: 'transform .15s', transform: abierto ? 'rotate(180deg)' : 'none' }} />
        </div>
      </div>

      {abierto && (
        <div style={{ padding: '4px 16px 16px', borderTop: '1px solid #F1F5F9' }}>
          {(o.celular || lat) && (
            <div style={{ display: 'flex', gap: 6, margin: '10px 0' }}>
              {o.celular && (
                <BtnIcono href={`tel:${o.celular}`} color="#1E3A5F" bg="#F4F8FC" border="#E2ECF4">
                  <Phone size={13} /> Llamar
                </BtnIcono>
              )}
              {o.celular && (
                <BtnIcono href={linkWhatsapp(o.celular)} color="#16A34A" bg="#F0FDF4" border="#BBF7D0">
                  <MessageCircle size={13} /> WhatsApp
                </BtnIcono>
              )}
              {lat && (
                <BtnIcono href={linkMapaExterno(lat, lng)} color="#2563EB" bg="#EFF6FF" border="#BFDBFE">
                  <Navigation size={13} /> Mapa
                </BtnIcono>
              )}
            </div>
          )}

          <FilaDetalle icon={<Fingerprint size={13} color="#8AAABB" />} label="DNI" value={o.dni} />
          <FilaDetalle icon={<MapPin size={13} color="#8AAABB" />} label="Referencia" value={o.referencia} />
          <FilaDetalle icon={<MapPin size={13} color="#8AAABB" />} label="Sector" value={o.sector} />

          {o.consumos?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8AAABB', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Materiales gastados</div>
              {o.consumos.map(c => (
                <FilaDetalle key={c.id} icon={<Package size={13} color="#8AAABB" />} label={c.producto?.nombre} value={`${c.cantidad} ${c.producto?.unidad || ''}`} />
              ))}
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8AAABB', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>Seguimiento</div>
            <FilaDetalle label="Asignada" value={fmtFechaHora(o.fechaAsignacion)} />
            <FilaDetalle label="Aceptada" value={fmtFechaHora(o.fechaAceptacion)} />
            <FilaDetalle label="Iniciada" value={fmtFechaHora(o.fechaInicio)} />
            <FilaDetalle label="Completada" value={fmtFechaHora(o.fechaFin)} />
          </div>

          {o.observacion && <FilaDetalle label="Comentario" value={o.observacion} />}
        </div>
      )}
    </div>
  );
}

export default function TecnicoOrdenes() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('activas');

  const activasQ = useQuery({
    queryKey: ['tecnico-ordenes'],
    queryFn: () => tecnicoOrdenesApi.listar().then(r => r.data),
    refetchInterval: 20000,
    enabled: tab === 'activas',
  });

  const historialQ = useQuery({
    queryKey: ['tecnico-ordenes-historial'],
    queryFn: () => tecnicoOrdenesApi.historial().then(r => r.data),
    enabled: tab === 'historial',
  });

  const ordenes = tab === 'activas' ? (activasQ.data || []) : (historialQ.data || []);
  const isLoading = tab === 'activas' ? activasQ.isLoading : historialQ.isLoading;

  const pendientes = ordenes.filter(o => o.estado === 'PENDIENTE');
  const mias = ordenes.filter(o => o.estado !== 'PENDIENTE');

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ k: 'activas', l: 'Activas' }, { k: 'historial', l: 'Historial' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            border: '1px solid', background: tab === t.k ? '#1E3A8A' : '#fff', color: tab === t.k ? '#fff' : '#5A7A9A',
            borderColor: tab === t.k ? '#1E3A8A' : '#E2ECF4',
          }}>
            {t.l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8AAABB', fontSize: 13 }}>Cargando...</div>
      ) : tab === 'activas' ? (
        <>
          {pendientes.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Pendientes sin asignar ({pendientes.length})
              </div>
              {pendientes.map(o => <OrdenCard key={o.id} o={o} onClick={() => navigate(`/tecnico/ordenes/${o.id}`)} />)}
            </>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#3B9FD4', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '16px 0 8px' }}>
            Mis órdenes en curso ({mias.length})
          </div>
          {mias.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#8AAABB', fontSize: 13 }}>No tienes órdenes asignadas en curso</div>
          ) : mias.map(o => <OrdenCard key={o.id} o={o} onClick={() => navigate(`/tecnico/ordenes/${o.id}`)} />)}
        </>
      ) : (
        ordenes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#8AAABB', fontSize: 13 }}>Sin órdenes completadas todavía</div>
        ) : ordenes.map(o => <OrdenCardHistorial key={o.id} o={o} />)
      )}
    </div>
  );
}
