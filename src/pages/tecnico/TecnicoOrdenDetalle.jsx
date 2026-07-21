import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Phone, Fingerprint, MapPin, Wifi, Plus, Trash2,
  CheckCircle2, PlayCircle, ClipboardCheck, Crosshair, MessageCircle, Navigation, Package,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { tecnicoOrdenesApi, tecnicoPuntosRedApi, tecnicoInventarioApi } from '../../services/tecnicoApi';
import { tipoLabelConServicio } from '../../utils/tiposOrden';

function fmtFechaHora(f) {
  if (!f) return '—';
  return new Date(f).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function linkWhatsapp(telefono) {
  const digitos = (telefono || '').replace(/\D/g, '');
  const conCodigo = digitos.length === 9 ? `51${digitos}` : digitos;
  return `https://wa.me/${conCodigo}`;
}

function linkMapaExterno(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const btnAccion = {
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  padding: '10px 6px', borderRadius: 10, border: '1px solid #E2ECF4', background: '#F4F8FC',
  color: '#1E3A5F', fontSize: 11, fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
};

function iconoCasa() {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;background:#DC2626;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
    iconSize: [26, 26], iconAnchor: [13, 26],
  });
}

function CapturarClick({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function MapaGPS({ lat, lng, onChange }) {
  const centro = [lat || -8.0859, lng || -78.9610];
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #E2ECF4', height: 220 }}>
      <MapContainer center={centro} zoom={lat ? 17 : 13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <CapturarClick onPick={onChange} />
        {lat && lng && <Marker position={[lat, lng]} icon={iconoCasa()} />}
      </MapContainer>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2ECF4', overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>{titulo}</div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function Fila({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F8FAFC' }}>
      {icon}
      <span style={{ fontSize: 12, color: '#8AAABB', minWidth: 80 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0D1B2A', fontWeight: 500, flex: 1, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

const inputStyle = {
  width: '100%', height: 40, padding: '0 12px', background: '#F4F8FC', border: '1px solid #C8DAEA',
  borderRadius: 8, color: '#0D1B2A', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const btnPrimary = {
  width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: '#1E3A8A', color: '#fff',
  fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};

export default function TecnicoOrdenDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [gps, setGps] = useState({ lat: null, lng: null });
  const [puntoRedId, setPuntoRedId] = useState('');
  const [equipoProductoId, setEquipoProductoId] = useState('');
  const [equipoSerie, setEquipoSerie] = useState('');
  const [precinto, setPrecinto] = useState('');
  const [comentario, setComentario] = useState('');
  const [consumos, setConsumos] = useState([{ productoId: '', cantidad: '' }]);

  const { data: o, isLoading } = useQuery({
    queryKey: ['tecnico-orden', id],
    queryFn: () => tecnicoOrdenesApi.obtener(id).then(r => r.data),
  });

  const esInstalacion = o?.tipoOrden?.startsWith('INSTALACION');
  const esCambioEquipo = o?.tipoOrden?.startsWith('CAMBIO_EQUIPO');
  const requiereEquipo = esInstalacion || esCambioEquipo;

  // Si el contrato ya tiene coordenadas de una instalación previa (ej. una avería
  // sobre un contrato ya instalado), precargamos el mapa con esa ubicación.
  useEffect(() => {
    if (!o || gps.lat) return;
    const lat = o.latitud ?? o.contrato?.latitud;
    const lng = o.longitud ?? o.contrato?.longitud;
    if (lat && lng) setGps({ lat, lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o]);

  // Si el cliente ya tiene precinto registrado, lo precargamos (queda editable).
  useEffect(() => {
    if (!o || precinto) return;
    const precintoActual = o.precinto ?? o.contrato?.precinto;
    if (precintoActual) setPrecinto(precintoActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o]);

  const ubicacion = { lat: o?.latitud ?? o?.contrato?.latitud, lng: o?.longitud ?? o?.contrato?.longitud };

  const puntosQ = useQuery({ queryKey: ['tecnico-puntos-red'], queryFn: () => tecnicoPuntosRedApi.listar().then(r => r.data), enabled: o?.estado === 'EN_PROCESO' });
  const inventarioQ = useQuery({ queryKey: ['tecnico-inventario'], queryFn: () => tecnicoInventarioApi.productos().then(r => r.data), enabled: o?.estado === 'EN_PROCESO' });

  // Solo productos que realmente tienen existencia disponible en el almacén
  const disponibles = (inventarioQ.data || []).filter(p => p.esMedible ? (p.metrosDisponibles || 0) > 0 : p.stockTotal > 0);
  // Para el selector de equipo (ONU), solo productos de la categoría "Onu"
  const equiposOnu = disponibles.filter(p => (p.categoria || '').toLowerCase() === 'onu');

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['tecnico-orden', id] });
    qc.invalidateQueries({ queryKey: ['tecnico-ordenes'] });
  };

  const tomarM = useMutation({
    mutationFn: () => tecnicoOrdenesApi.tomar(id),
    onSuccess: () => { toast.success('Orden tomada'); invalidar(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo tomar la orden'),
  });
  const aceptarM = useMutation({
    mutationFn: () => tecnicoOrdenesApi.aceptar(id),
    onSuccess: () => { toast.success('Orden aceptada'); invalidar(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo aceptar la orden'),
  });
  const iniciarM = useMutation({
    mutationFn: () => tecnicoOrdenesApi.iniciar(id),
    onSuccess: () => { toast.success('Trabajo iniciado'); invalidar(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo iniciar'),
  });
  const completarM = useMutation({
    mutationFn: (payload) => tecnicoOrdenesApi.completar(id, payload),
    onSuccess: () => { toast.success('¡Orden completada!'); navigate('/tecnico'); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo completar la orden'),
  });

  const agregarConsumo = () => setConsumos([...consumos, { productoId: '', cantidad: '' }]);
  const quitarConsumo = (i) => setConsumos(consumos.filter((_, idx) => idx !== i));
  const actualizarConsumo = (i, campo, valor) => setConsumos(consumos.map((c, idx) => idx === i ? { ...c, [campo]: valor } : c));

  const handleCompletar = () => {
    for (const c of consumos) {
      if (!c.productoId || !(Number(c.cantidad) > 0)) continue;
      const prod = disponibles.find(p => String(p.id) === String(c.productoId));
      const disponible = prod?.esMedible ? (prod.metrosDisponibles || 0) : (prod?.stockTotal || 0);
      if (Number(c.cantidad) > disponible) {
        toast.error(`"${prod?.nombre}" solo tiene ${disponible}${prod?.esMedible ? 'm' : ''} disponible(s)`);
        return;
      }
    }
    completarM.mutate({
      latitud: gps.lat, longitud: gps.lng, puntoRedId, equipoProductoId, equipoSerie,
      precinto, comentario,
      consumos: consumos.filter(c => c.productoId && Number(c.cantidad) > 0),
    });
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#8AAABB' }}>Cargando...</div>;
  if (!o) return <div style={{ padding: 40, textAlign: 'center', color: '#DC2626' }}>Orden no encontrada</div>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate('/tecnico')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#5A7A9A', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
        <ArrowLeft size={15} /> Volver
      </button>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E3A8A', fontSize: 14 }}>{o.nServicio}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0D1B2A' }}>{o.abonado}</div>
        <div style={{ fontSize: 13, color: '#3B9FD4', fontWeight: 600 }}>{tipoLabelConServicio(o.tipoOrden)}</div>
      </div>

      <Seccion titulo="Datos del abonado">
        {o.dni && <Fila icon={<Fingerprint size={13} color="#8AAABB" />} label="DNI" value={o.dni} />}
        {o.celular && <Fila icon={<Phone size={13} color="#8AAABB" />} label="Celular" value={o.celular} />}
        <Fila icon={<MapPin size={13} color="#8AAABB" />} label="Dirección" value={o.direccion} />
        {o.referencia && <Fila icon={<MapPin size={13} color="#8AAABB" />} label="Referencia" value={o.referencia} />}
        {o.sector && <Fila icon={<MapPin size={13} color="#8AAABB" />} label="Sector" value={o.sector} />}
        {(o.plan || o.mbps) && <Fila icon={<Wifi size={13} color="#8AAABB" />} label="Plan" value={`${o.plan?.nombre || ''}${o.mbps ? ` (${o.mbps}Mbps)` : ''}`} />}

        {(o.celular || ubicacion.lat) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {o.celular && (
              <a href={`tel:${o.celular}`} style={btnAccion}>
                <Phone size={16} /> Llamar
              </a>
            )}
            {o.celular && (
              <a href={linkWhatsapp(o.celular)} target="_blank" rel="noreferrer" style={{ ...btnAccion, background: '#F0FDF4', borderColor: '#BBF7D0', color: '#16A34A' }}>
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {ubicacion.lat && (
              <a href={linkMapaExterno(ubicacion.lat, ubicacion.lng)} target="_blank" rel="noreferrer" style={{ ...btnAccion, background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB' }}>
                <Navigation size={16} /> Abrir mapa
              </a>
            )}
          </div>
        )}
      </Seccion>

      {o.consumos?.length > 0 && (
        <Seccion titulo="Materiales gastados">
          {o.consumos.map(c => (
            <Fila key={c.id} icon={<Package size={13} color="#8AAABB" />} label={c.producto?.nombre} value={`${c.cantidad} ${c.producto?.unidad || ''}`} />
          ))}
        </Seccion>
      )}

      {(o.ipWan || o.mascara || o.gateway) && (
        <Seccion titulo="Datos de red (IP)">
          {o.ipWan && <Fila label="IP WAN" value={o.ipWan} />}
          {o.mascara && <Fila label="Máscara" value={o.mascara} />}
          {o.gateway && <Fila label="Gateway" value={o.gateway} />}
        </Seccion>
      )}

      <Seccion titulo="Seguimiento">
        {o.fechaAsignacion && <Fila label="Asignada" value={fmtFechaHora(o.fechaAsignacion)} />}
        {o.fechaAceptacion && <Fila label="Aceptada" value={fmtFechaHora(o.fechaAceptacion)} />}
        {o.fechaInicio && <Fila label="Iniciada" value={fmtFechaHora(o.fechaInicio)} />}
        {o.fechaFin && <Fila label="Completada" value={fmtFechaHora(o.fechaFin)} />}
      </Seccion>

      {o.estado === 'PENDIENTE' && !o.tecnicoId && (
        <button style={btnPrimary} disabled={tomarM.isPending} onClick={() => tomarM.mutate()}>
          <ClipboardCheck size={16} /> Tomar esta orden
        </button>
      )}

      {o.estado === 'ASIGNADA' && !o.fechaAceptacion && (
        <button style={btnPrimary} disabled={aceptarM.isPending} onClick={() => aceptarM.mutate()}>
          <CheckCircle2 size={16} /> Aceptar orden
        </button>
      )}

      {o.estado === 'ASIGNADA' && o.fechaAceptacion && (
        <button style={btnPrimary} disabled={iniciarM.isPending} onClick={() => iniciarM.mutate()}>
          <PlayCircle size={16} /> Iniciar trabajo
        </button>
      )}

      {o.estado === 'EN_PROCESO' && (
        <>
          <Seccion titulo="Ubicar la casa por GPS">
            <MapaGPS lat={gps.lat} lng={gps.lng} onChange={(lat, lng) => setGps({ lat, lng })} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#5A7A9A' }}>
              <Crosshair size={12} /> Toca el mapa sobre la ubicación exacta de la vivienda
            </div>
          </Seccion>

          {requiereEquipo && (
            <Seccion titulo={esCambioEquipo ? 'Equipo nuevo (cambio de equipo)' : 'Punto de red y equipo (opcional)'}>
              {esInstalacion && (
                <>
                  <label style={{ fontSize: 11, color: '#8AAABB', fontWeight: 600 }}>Punto de red (NAP/CTO)</label>
                  <select style={{ ...inputStyle, marginTop: 4, marginBottom: 10 }} value={puntoRedId} onChange={e => setPuntoRedId(e.target.value)}>
                    <option value="">Sin especificar</option>
                    {(puntosQ.data || []).map(p => <option key={p.id} value={p.id}>{p.codigo} ({p.tipo})</option>)}
                  </select>
                </>
              )}
              {esCambioEquipo && o.contrato?.equipoSerie && (
                <div style={{ fontSize: 12, color: '#5A7A9A', marginBottom: 10, padding: '8px 10px', background: '#F4F8FC', borderRadius: 8 }}>
                  Equipo actual: N° serie/MAC <strong>{o.contrato.equipoSerie}</strong>
                </div>
              )}
              <label style={{ fontSize: 11, color: '#8AAABB', fontWeight: 600 }}>{esCambioEquipo ? 'Equipo nuevo (ONU)' : 'Equipo instalado (ONU)'}</label>
              <select style={{ ...inputStyle, marginTop: 4, marginBottom: 10 }} value={equipoProductoId} onChange={e => setEquipoProductoId(e.target.value)}>
                <option value="">Sin especificar</option>
                {equiposOnu.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.stockTotal} disp.)</option>)}
              </select>
              <label style={{ fontSize: 11, color: '#8AAABB', fontWeight: 600 }}>{esCambioEquipo ? 'N° serie / MAC del equipo nuevo' : 'N° serie / MAC'}</label>
              <input style={{ ...inputStyle, marginTop: 4 }} value={equipoSerie} onChange={e => setEquipoSerie(e.target.value)} placeholder="ABCD1234" />
            </Seccion>
          )}

          <Seccion titulo="Materiales gastados">
            {consumos.map((c, i) => {
              const prodSel = disponibles.find(p => String(p.id) === String(c.productoId));
              return (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select style={{ ...inputStyle, flex: 2 }} value={c.productoId} onChange={e => actualizarConsumo(i, 'productoId', e.target.value)}>
                      <option value="">Producto...</option>
                      {disponibles.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <input type="number" min="0.1" step={prodSel?.esMedible ? '0.1' : '1'} style={{ ...inputStyle, flex: 1 }}
                      placeholder={prodSel?.esMedible ? 'Metros' : 'Cant.'} value={c.cantidad}
                      onChange={e => actualizarConsumo(i, 'cantidad', e.target.value)} />
                    <button onClick={() => quitarConsumo(i)} style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={14} style={{ margin: '0 auto' }} />
                    </button>
                  </div>
                  {prodSel && (
                    <div style={{ fontSize: 11, color: '#8AAABB', marginTop: 3 }}>
                      Disponible: {prodSel.esMedible ? `${prodSel.metrosDisponibles} metros` : `${prodSel.stockTotal} ${prodSel.unidad || 'unidades'}`}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={agregarConsumo} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px dashed #C8DAEA', borderRadius: 8, padding: '8px 12px', color: '#1E3A8A', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
              <Plus size={14} /> Agregar material
            </button>
          </Seccion>

          <Seccion titulo="Precinto y comentario">
            <label style={{ fontSize: 11, color: '#8AAABB', fontWeight: 600 }}>N° de precinto</label>
            <input style={{ ...inputStyle, marginTop: 4, marginBottom: 10 }} value={precinto} onChange={e => setPrecinto(e.target.value)} placeholder="PR-00123" />
            <label style={{ fontSize: 11, color: '#8AAABB', fontWeight: 600 }}>Comentario (opcional)</label>
            <textarea rows={3} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', marginTop: 4, resize: 'vertical', fontFamily: 'inherit' }} value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Observaciones de la instalación..." />
          </Seccion>

          <button style={{ ...btnPrimary, background: '#16A34A' }} disabled={completarM.isPending} onClick={handleCompletar}>
            <CheckCircle2 size={16} /> Completar orden
          </button>
        </>
      )}

      <div style={{ height: 30 }} />
    </div>
  );
}
