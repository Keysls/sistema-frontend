import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  DollarSign, Search, X, RefreshCw, CheckCircle2, MessageCircle, Download, AlertTriangle,
  FileSpreadsheet, TrendingDown, Plus, Wallet, Users, ClipboardList, PlusCircle, Percent,
} from 'lucide-react';
import { contratosApi, cargosApi, pagosApi, empresaApi, egresosApi } from '../services/api';
import { Btn, Badge, Table, Tr, Td, Modal } from '../components/ui';
import { useAuthStore } from '../store/auth.store';
import { formatMetodosPagoTexto } from '../utils/metodosPago';

const METODOS = {
  EFECTIVO: 'Efectivo',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
};

const METODO_COLOR = {
  EFECTIVO: '#16A34A', YAPE: '#7C3AED', PLIN: '#2563EB', TRANSFERENCIA: '#0891B2', TARJETA: '#D97706',
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

function SeccionCard({ titulo, icono: Icono, colorIcono, accion, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 8, borderBottom: '1px solid #E2ECF4', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icono size={14} color={colorIcono || '#2563EB'} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: colorIcono || '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{titulo}</span>
        </div>
        {accion}
      </div>
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

const emptyEgreso = { concepto: '', categoria: '', monto: '', fecha: new Date().toISOString().slice(0, 10), observacion: '' };

// ─────────────────────────────────────────────────────────────────
// Reporte de caja — siempre visible arriba de todo
// ─────────────────────────────────────────────────────────────────
function ReporteCaja() {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const [fechaDesde, setFechaDesde] = useState(primerDiaMes);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().slice(0, 10));

  const params = { fechaDesde: fechaDesde || undefined, fechaHasta: fechaHasta || undefined };

  const reporteQ = useQuery({
    queryKey: ['pagos-reporte', fechaDesde, fechaHasta],
    queryFn: () => pagosApi.reporte(params).then(r => r.data),
  });

  const egresosQ = useQuery({
    queryKey: ['egresos', fechaDesde, fechaHasta],
    queryFn: () => egresosApi.listar(params).then(r => r.data),
  });

  const egresos = egresosQ.data || [];
  const reporte = reporteQ.data;

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
    <SeccionCard titulo="Reporte de caja" icono={Wallet}
      accion={<Btn variant="ghost" size="sm" icon={<FileSpreadsheet size={13} />} onClick={exportarReporteExcel}>Exportar Excel</Btn>}>

      <div className="resp-toolbar" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#64748B' }}>Del</span>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} max={fechaHasta || undefined}
          style={{ height: 34, padding: '0 10px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 6, fontSize: 13 }} />
        <span style={{ fontSize: 12, color: '#64748B' }}>al</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} min={fechaDesde || undefined}
          style={{ height: 34, padding: '0 10px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 6, fontSize: 13 }} />
      </div>

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

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
    </SeccionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// Pestaña: Registrar egresos
// ─────────────────────────────────────────────────────────────────
function TabEgresos() {
  const qc = useQueryClient();
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const [fechaDesde, setFechaDesde] = useState(primerDiaMes);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().slice(0, 10));
  const [nuevoEgreso, setNuevoEgreso] = useState(null);

  const params = { fechaDesde: fechaDesde || undefined, fechaHasta: fechaHasta || undefined };

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
  const egresoValido = nuevoEgreso && nuevoEgreso.concepto.trim() && nuevoEgreso.fecha && Number(nuevoEgreso.monto) > 0;

  return (
    <SeccionCard titulo={`Egresos (${egresos.length})`} icono={TrendingDown} colorIcono="#DC2626"
      accion={!nuevoEgreso && (
        <Btn variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => setNuevoEgreso(emptyEgreso)}>Registrar egreso</Btn>
      )}>

      <div className="resp-toolbar" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#64748B' }}>Del</span>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} max={fechaHasta || undefined}
          style={{ height: 34, padding: '0 10px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 6, fontSize: 13 }} />
        <span style={{ fontSize: 12, color: '#64748B' }}>al</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} min={fechaDesde || undefined}
          style={{ height: 34, padding: '0 10px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 6, fontSize: 13 }} />
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
    </SeccionCard>
  );
}

// ─────────────────────────────────────────────────────────────────
// Pestaña: Clientes con deuda
// ─────────────────────────────────────────────────────────────────
function TabDeudores({ metodosPago, onSeleccionarContrato }) {
  const [busqueda, setBusqueda] = useState('');
  const contratosQ = useQuery({
    queryKey: ['contratos'],
    queryFn: () => contratosApi.listar().then(r => r.data),
  });

  const deudores = useMemo(() => {
    return (contratosQ.data || [])
      .filter(c => c.deudaPendiente > 0)
      .sort((a, b) => (b.deudaVencida - a.deudaVencida) || (b.deudaPendiente - a.deudaPendiente));
  }, [contratosQ.data]);

  const deudoresFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return deudores;
    return deudores.filter(c => (
      `${c.cliente?.nombres || ''} ${c.cliente?.apellidos || ''}`.toLowerCase().includes(texto) ||
      (c.cliente?.dniRuc || '').toLowerCase().includes(texto) ||
      (c.numero || '').toLowerCase().includes(texto)
    ));
  }, [deudores, busqueda]);

  return (
    <SeccionCard titulo={`Clientes con deuda (${deudoresFiltrados.length}${busqueda.trim() ? ` de ${deudores.length}` : ''})`} icono={AlertTriangle} colorIcono="#DC2626"
      accion={<Btn variant="ghost" size="sm" icon={<FileSpreadsheet size={13} />} disabled={deudores.length === 0} onClick={() => exportarDeudoresExcel(deudoresFiltrados)}>Exportar Excel</Btn>}>

      {deudores.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 40, border: '1px solid #C9DAEA', borderRadius: 8, background: '#E1EBF5', marginBottom: 10 }}>
          <Search size={15} color="#64748B" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, apellido, DNI/RUC o N° contrato..."
            style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: '#1E3A5F' }}
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}>
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {contratosQ.isLoading ? (
        <p style={{ fontSize: 13, color: '#64748B' }}>Cargando...</p>
      ) : deudores.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#15803D', fontSize: 13, fontWeight: 600 }}>
          <CheckCircle2 size={15} /> Ningún cliente tiene deuda pendiente
        </div>
      ) : deudoresFiltrados.length === 0 ? (
        <p style={{ fontSize: 13, color: '#64748B' }}>Sin resultados para "{busqueda}"</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
          {deudoresFiltrados.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.deudaVencida ? '#FECACA' : '#FDE68A'}`, background: c.deudaVencida ? '#FEF2F2' : '#FFFBEB' }}>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onSeleccionarContrato(c)}>
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
    </SeccionCard>
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

const emptyCargoManual = { periodo: new Date().toISOString().slice(0, 7), monto: '', vencimiento: '' };

// ─────────────────────────────────────────────────────────────────
// Pestaña: Registrar cobro (incluye cobros parciales + generar deuda manual)
// ─────────────────────────────────────────────────────────────────
function TabRegistrarCobro({ contrato, setContrato }) {
  const qc = useQueryClient();
  const puedeDescuento = useAuthStore(s => s.usuario?.rol === 'ADMIN' || s.usuario?.rol === 'SUPERVISOR');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [montoPagar, setMontoPagar] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [observacion, setObservacion] = useState('');
  const [mostrarCargoManual, setMostrarCargoManual] = useState(false);
  const [cargoManual, setCargoManual] = useState(emptyCargoManual);
  const [descuentoCargoId, setDescuentoCargoId] = useState(null);
  const [descuentoPct, setDescuentoPct] = useState('');

  const cargosQ = useQuery({
    queryKey: ['cargos-contrato', contrato?.id],
    queryFn: () => cargosApi.porContrato(contrato.id).then(r => r.data),
    enabled: Boolean(contrato),
  });

  const cargos = cargosQ.data || [];

  const saldoSeleccionado = useMemo(
    () => cargos.filter(c => seleccionados.has(c.id)).reduce((sum, c) => sum + Number(c.saldo), 0),
    [cargos, seleccionados]
  );

  // Al cambiar la selección de meses, se propone pagar el total (el usuario puede bajarlo para un pago parcial)
  useEffect(() => {
    setMontoPagar(saldoSeleccionado > 0 ? saldoSeleccionado.toFixed(2) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saldoSeleccionado]);

  const registrarM = useMutation({
    mutationFn: () => pagosApi.crear({
      contratoId: contrato.id, fecha, metodoPago, observacion,
      monto: Number(montoPagar),
      cargoIds: cargos.filter(c => seleccionados.has(c.id)).map(c => c.id),
    }),
    onSuccess: () => {
      toast.success('Pago registrado');
      setSeleccionados(new Set());
      setObservacion('');
      qc.invalidateQueries({ queryKey: ['cargos-contrato'] });
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['contratos'] });
      qc.invalidateQueries({ queryKey: ['pagos-reporte'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo registrar el pago'),
  });

  const aplicarDescuentoM = useMutation({
    mutationFn: () => cargosApi.aplicarDescuento(descuentoCargoId, Number(descuentoPct)),
    onSuccess: () => {
      toast.success('Descuento aplicado');
      setDescuentoCargoId(null);
      setDescuentoPct('');
      qc.invalidateQueries({ queryKey: ['cargos-contrato'] });
      qc.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo aplicar el descuento'),
  });

  const quitarDescuentoM = useMutation({
    mutationFn: (cargoId) => cargosApi.quitarDescuento(cargoId),
    onSuccess: () => {
      toast.success('Descuento quitado');
      setDescuentoCargoId(null);
      setDescuentoPct('');
      qc.invalidateQueries({ queryKey: ['cargos-contrato'] });
      qc.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo quitar el descuento'),
  });

  const crearCargoManualM = useMutation({
    mutationFn: () => cargosApi.crearManual({ contratoId: contrato.id, ...cargoManual, monto: Number(cargoManual.monto) }),
    onSuccess: () => {
      toast.success('Deuda generada manualmente');
      setMostrarCargoManual(false);
      setCargoManual(emptyCargoManual);
      qc.invalidateQueries({ queryKey: ['cargos-contrato'] });
      qc.invalidateQueries({ queryKey: ['contratos'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo generar el cargo'),
  });

  const toggleCargo = (id) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const seleccionarContrato = (c) => {
    setContrato(c);
    setSeleccionados(new Set());
    setMostrarCargoManual(false);
  };

  const montoNumerico = Number(montoPagar);
  const puedeRegistrar = contrato && seleccionados.size > 0 && fecha && metodoPago
    && montoNumerico > 0 && montoNumerico <= saldoSeleccionado + 0.009 && !registrarM.isPending;

  const cargoManualValido = cargoManual.periodo && Number(cargoManual.monto) > 0;

  return (
    <SeccionCard titulo="Registrar cobro" icono={ClipboardList}>
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>Meses pendientes</label>
                {!mostrarCargoManual && (
                  <button type="button" onClick={() => setMostrarCargoManual(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    <PlusCircle size={13} /> Generar deuda manual
                  </button>
                )}
              </div>

              {mostrarCargoManual && (
                <div style={{ border: '1px dashed #C9DAEA', borderRadius: 10, padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Campo label="Período (mes)" required>
                      <input type="month" style={campoInputStyle} value={cargoManual.periodo} onChange={e => setCargoManual({ ...cargoManual, periodo: e.target.value })} />
                    </Campo>
                    <Campo label="Monto (S/)" required>
                      <input type="number" step="0.01" style={campoInputStyle} value={cargoManual.monto}
                        onChange={e => setCargoManual({ ...cargoManual, monto: e.target.value })}
                        placeholder={contrato.costoMensual ? Number(contrato.costoMensual).toFixed(2) : '80.00'} />
                    </Campo>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Btn variant="ghost" onClick={() => { setMostrarCargoManual(false); setCargoManual(emptyCargoManual); }}>Cancelar</Btn>
                    <Btn disabled={!cargoManualValido || crearCargoManualM.isPending} loading={crearCargoManualM.isPending} onClick={() => crearCargoManualM.mutate()}>
                      Generar cargo
                    </Btn>
                  </div>
                </div>
              )}

              {cargosQ.isLoading ? (
                <p style={{ fontSize: 13, color: '#64748B' }}>Cargando deuda...</p>
              ) : cargos.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#15803D', fontSize: 13, fontWeight: 600 }}>
                  <CheckCircle2 size={15} /> Este contrato no tiene deuda pendiente
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cargos.map(c => {
                    const esParcial = c.estado === 'PARCIAL';
                    const descontando = descuentoCargoId === c.id;
                    const tieneDescuento = c.montoOriginal != null;
                    const pctActual = tieneDescuento ? Math.round((1 - Number(c.monto) / Number(c.montoOriginal)) * 100) : null;
                    return (
                      <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                          border: `1.5px solid ${seleccionados.has(c.id) ? '#2563EB' : '#C9DAEA'}`,
                          background: seleccionados.has(c.id) ? '#EFF6FF' : '#F8FAFC',
                        }}>
                          <input type="checkbox" checked={seleccionados.has(c.id)} onChange={() => toggleCargo(c.id)} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{fmtPeriodo(c.periodo)}</span>
                            {esParcial && (
                              <div style={{ fontSize: 11, color: '#B45309' }}>Abonado S/ {(Number(c.monto) - Number(c.saldo)).toFixed(2)} de S/ {Number(c.monto).toFixed(2)}</div>
                            )}
                            {tieneDescuento && (
                              <div style={{ fontSize: 11, color: '#15803D' }}>
                                {c.nota} · antes S/ {Number(c.montoOriginal).toFixed(2)}
                              </div>
                            )}
                          </div>
                          {c.vencido && <Badge color="red">Vencido</Badge>}
                          {esParcial && <Badge color="yellow">Parcial</Badge>}
                          {tieneDescuento && !esParcial && <Badge color="green">-{pctActual}%</Badge>}
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>S/ {Number(c.saldo).toFixed(2)}</span>
                          {c.estado === 'PENDIENTE' && puedeDescuento && (
                            <button type="button" title={tieneDescuento ? 'Cambiar el descuento' : 'Aplicar descuento a este mes'}
                              onClick={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                setDescuentoCargoId(descontando ? null : c.id);
                                setDescuentoPct(descontando ? '' : (tieneDescuento ? String(pctActual) : ''));
                              }}
                              style={{ background: 'transparent', border: '1px solid #C9DAEA', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}>
                              {tieneDescuento ? 'Cambiar %' : '% Descuento'}
                            </button>
                          )}
                        </label>
                        {descontando && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: '#92400E' }}>
                              Descuento % para {fmtPeriodo(c.periodo)} (S/ {Number(tieneDescuento ? c.montoOriginal : c.monto).toFixed(2)} sin descuento):
                            </span>
                            <input type="number" min={1} max={100} step={1} value={descuentoPct} onChange={e => setDescuentoPct(e.target.value)}
                              style={{ width: 70, height: 30, textAlign: 'center', border: '1px solid #FDE68A', borderRadius: 6 }} />
                            <Btn size="sm" disabled={!(Number(descuentoPct) > 0) || aplicarDescuentoM.isPending} onClick={() => aplicarDescuentoM.mutate()}>
                              {tieneDescuento ? 'Actualizar' : 'Aplicar'}
                            </Btn>
                            {tieneDescuento && (
                              <Btn size="sm" variant="danger" disabled={quitarDescuentoM.isPending} onClick={() => quitarDescuentoM.mutate(c.id)}>
                                Quitar descuento
                              </Btn>
                            )}
                            <Btn size="sm" variant="ghost" onClick={() => setDescuentoCargoId(null)}>Cancelar</Btn>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cargos.length > 0 && seleccionados.size > 0 && (
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

                <Campo label="Monto a pagar (S/)" required>
                  <input type="number" step="0.01" style={{ ...campoInputStyle, fontWeight: 700, fontSize: 16 }}
                    value={montoPagar} onChange={e => setMontoPagar(e.target.value)} max={saldoSeleccionado} />
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#8AAABB' }}>
                    Deuda seleccionada: S/ {saldoSeleccionado.toFixed(2)}. Si pagas menos, el pago se aplica primero al mes más antiguo y el resto queda parcial.
                  </p>
                </Campo>

                {montoNumerico > 0 && montoNumerico < saldoSeleccionado - 0.009 && (
                  <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12.5, color: '#92400E' }}>
                    Pago parcial: quedará un saldo pendiente de S/ {(saldoSeleccionado - montoNumerico).toFixed(2)} en los meses seleccionados.
                  </div>
                )}

                <Btn disabled={!puedeRegistrar} loading={registrarM.isPending} onClick={() => registrarM.mutate()} style={{ background: '#16A34A', fontWeight: 700 }}>
                  Registrar cobro
                </Btn>
              </>
            )}

            <HistorialClientePago contratoId={contrato.id} />
          </>
        )}
      </div>
    </SeccionCard>
  );
}

// Historial de pagos de un solo cliente/contrato (usado dentro de Registrar cobro)
function HistorialClientePago({ contratoId }) {
  const historialQ = useQuery({
    queryKey: ['pagos', 'contrato', contratoId],
    queryFn: () => pagosApi.listar({ contratoId }).then(r => r.data),
    enabled: Boolean(contratoId),
  });

  const pagos = historialQ.data || [];

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', display: 'block', marginBottom: 8 }}>
        Historial de pagos de este cliente
      </label>
      {historialQ.isLoading ? (
        <p style={{ fontSize: 13, color: '#64748B' }}>Cargando...</p>
      ) : pagos.length === 0 ? (
        <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 8, color: '#64748B', fontSize: 13 }}>
          Este cliente aún no tiene pagos registrados
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pagos.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: '#1E3A5F' }}>
                  {p.cargos.map(pc => fmtPeriodo(pc.cargo.periodo)).join(', ')}
                </div>
                <div style={{ fontSize: 11, color: '#8AAABB' }}>
                  {fmtFecha(p.fecha)} · {p.usuario?.nombre} {p.usuario?.apellido}
                </div>
              </div>
              <Badge color="blue">{METODOS[p.metodoPago]}</Badge>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' }}>S/ {Number(p.monto).toFixed(2)}</span>
              <Btn variant="ghost" size="sm" icon={<Download size={13} />} onClick={() => descargarComprobante(p.id, pagosApi)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Pestaña: Historial de pagos (todos los clientes)
// ─────────────────────────────────────────────────────────────────
function TabHistorial() {
  const [qHistorial, setQHistorial] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [metodoFiltro, setMetodoFiltro] = useState('');

  const historialQ = useQuery({
    queryKey: ['pagos', qHistorial, fechaDesde, fechaHasta, metodoFiltro],
    queryFn: () => pagosApi.listar({
      q: qHistorial || undefined,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined,
      metodoPago: metodoFiltro || undefined,
    }).then(r => r.data),
  });

  const pagos = historialQ.data || [];

  return (
    <SeccionCard titulo="Historial de pagos" icono={ClipboardList}
      accion={<Btn variant="ghost" size="sm" icon={<FileSpreadsheet size={13} />} disabled={pagos.length === 0} onClick={() => exportarHistorialExcel(pagos)}>Exportar Excel</Btn>}>

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
    </SeccionCard>
  );
}

const TABS = [
  { key: 'deudores', label: 'Clientes con deuda', icon: AlertTriangle },
  { key: 'cobro', label: 'Registrar cobro', icon: ClipboardList },
  { key: 'egresos', label: 'Registrar egresos', icon: TrendingDown },
  { key: 'historial', label: 'Historial de pagos', icon: FileSpreadsheet },
];

function ModalGenerarCargos({ open, onClose, onGenerado }) {
  const [exonerados, setExonerados] = useState({});
  const [descuentos, setDescuentos] = useState({});
  const [busqueda, setBusqueda] = useState('');

  const previewQ = useQuery({
    queryKey: ['cargos-preview'],
    queryFn: () => cargosApi.preview().then(r => r.data),
    enabled: open,
  });

  useEffect(() => {
    if (open) { setExonerados({}); setDescuentos({}); setBusqueda(''); }
  }, [open]);

  const generarM = useMutation({
    mutationFn: () => cargosApi.generar({
      exonerarIds: Object.keys(exonerados).filter(id => exonerados[id]),
      descuentos: Object.fromEntries(Object.entries(descuentos).filter(([, v]) => Number(v) > 0)),
    }),
    onSuccess: (res) => {
      toast.success(`${res.data.creados} cargo(s) generado(s) para el período ${res.data.periodo}`);
      onGenerado();
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo generar los cargos'),
  });

  const contratos = previewQ.data?.contratos || [];
  const cantidadExonerados = Object.values(exonerados).filter(Boolean).length;
  const aCobrar = contratos.length - cantidadExonerados;

  const contratosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return contratos;
    return contratos.filter(c => c.numero.toLowerCase().includes(texto) || c.cliente.toLowerCase().includes(texto));
  }, [contratos, busqueda]);

  return (
    <Modal open={open} onClose={onClose} title="Generar cargos del mes" subtitle={previewQ.data ? `Período ${previewQ.data.periodo} · ${contratos.length} elegible(s) · ${aCobrar} a cobrar${cantidadExonerados ? ` · ${cantidadExonerados} exonerado(s)` : ''}` : ''} width={620}>
      {previewQ.isLoading && <p style={{ fontSize: 13, color: 'var(--txt-3)' }}>Cargando contratos elegibles...</p>}
      {!previewQ.isLoading && contratos.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--txt-3)' }}>No hay contratos pendientes de generar cargo este mes.</p>
      )}
      {contratos.length > 0 && (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--txt-3)', marginTop: 0 }}>
            Marca "Exonerar" para no cobrarle este mes, o pon un % de descuento puntual. Los demás se generan con su monto normal.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 38, border: '1px solid var(--border-2)', borderRadius: 8, background: '#E1EBF5', marginBottom: 10 }}>
            <Search size={14} color="#64748B" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente o N° de contrato..."
              style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: '#1E3A5F' }}
            />
            {busqueda && (
              <button type="button" onClick={() => setBusqueda('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-2, #F3F6FA)', position: 'sticky', top: 0 }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Contrato</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Cliente</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>Monto</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>Exonerar</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>Descuento %</th>
                </tr>
              </thead>
              <tbody>
                {contratosFiltrados.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '14px 10px', textAlign: 'center', color: 'var(--txt-3)' }}>Sin resultados para "{busqueda}"</td></tr>
                )}
                {contratosFiltrados.map(c => (
                  <tr key={c.contratoId} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{c.numero}</td>
                    <td style={{ padding: '6px 10px' }}>{c.cliente}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>S/ {c.monto.toFixed(2)}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(exonerados[c.contratoId])}
                        onChange={(e) => setExonerados(prev => ({ ...prev, [c.contratoId]: e.target.checked }))}
                      />
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <input
                        type="number" min={0} max={100} step={1}
                        disabled={Boolean(exonerados[c.contratoId])}
                        value={descuentos[c.contratoId] || ''}
                        onChange={(e) => setDescuentos(prev => ({ ...prev, [c.contratoId]: e.target.value }))}
                        style={{ width: 60, height: 28, textAlign: 'center', border: '1px solid var(--border-2)', borderRadius: 6 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={generarM.isPending || previewQ.isLoading} onClick={() => generarM.mutate()}>
          {contratos.length > 0
            ? `Generar (${aCobrar} a cobrar${cantidadExonerados ? ` + ${cantidadExonerados} exonerado(s)` : ''})`
            : 'Generar'}
        </Btn>
      </div>
    </Modal>
  );
}

function ModalDescuentoMasivo({ open, onClose, onAplicado }) {
  const mesActual = new Date().toISOString().slice(0, 7);
  const [periodo, setPeriodo] = useState(mesActual);
  const [porcentaje, setPorcentaje] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (open) { setPeriodo(mesActual); setPorcentaje(''); setMotivo(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const previewQ = useQuery({
    queryKey: ['descuento-masivo-preview', periodo],
    queryFn: () => cargosApi.descuentoMasivoPreview(periodo).then(r => r.data),
    enabled: open && /^\d{4}-\d{2}$/.test(periodo),
  });

  const aplicarM = useMutation({
    mutationFn: () => cargosApi.descuentoMasivo({ periodo, porcentaje: Number(porcentaje), motivo }),
    onSuccess: (res) => {
      toast.success(`Descuento aplicado a ${res.data.actualizados} cargo(s)`);
      onAplicado();
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo aplicar el descuento masivo'),
  });

  const quitarM = useMutation({
    mutationFn: () => cargosApi.quitarDescuentoMasivo(periodo),
    onSuccess: (res) => {
      toast.success(`Descuento quitado de ${res.data.revertidos} cargo(s)`);
      onAplicado();
      previewQ.refetch();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo quitar el descuento masivo'),
  });

  const cantidad = previewQ.data?.cantidad ?? 0;
  const cantidadConDescuento = previewQ.data?.cantidadConDescuento ?? 0;
  const valido = /^\d{4}-\d{2}$/.test(periodo) && Number(porcentaje) > 0 && Number(porcentaje) <= 100;

  return (
    <Modal open={open} onClose={onClose} title="Descuento masivo" subtitle="Aplica un % de descuento a todos los cargos pendientes de un mes (ej. Fiestas Patrias)" width={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo label="Mes a descontar" required>
          <input type="month" style={campoInputStyle} value={periodo} onChange={e => setPeriodo(e.target.value)} />
        </Campo>
        <Campo label="Porcentaje de descuento" required>
          <input type="number" min={1} max={100} step={1} style={campoInputStyle} value={porcentaje} onChange={e => setPorcentaje(e.target.value)} placeholder="10" />
        </Campo>
        <Campo label="Motivo (opcional, se guarda como nota)">
          <input style={campoInputStyle} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Descuento Fiestas Patrias" />
        </Campo>

        <div style={{ padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12.5, color: '#1E3A5F' }}>
          {previewQ.isLoading ? 'Calculando...' : `Esto afectará a ${cantidad} cargo(s) pendiente(s) de ${periodo}. Los cargos ya pagados, parciales o de otros meses no se tocan.`}
        </div>

        {cantidadConDescuento > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
            <span style={{ fontSize: 12.5, color: '#991B1B' }}>
              {cantidadConDescuento} cargo(s) de {periodo} ya tienen un descuento activo.
            </span>
            <Btn size="sm" variant="danger" disabled={quitarM.isPending} onClick={() => quitarM.mutate()}>
              Quitar descuento del mes
            </Btn>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={!valido || cantidad === 0 || aplicarM.isPending} onClick={() => aplicarM.mutate()}>
            Aplicar a {cantidad} cargo(s)
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function Pagos() {
  const qc = useQueryClient();
  const puedeDescuentoMasivo = useAuthStore(s => s.usuario?.rol === 'ADMIN' || s.usuario?.rol === 'SUPERVISOR');
  const [tab, setTab] = useState('deudores');
  const [contrato, setContrato] = useState(null);
  const [modalCargosAbierto, setModalCargosAbierto] = useState(false);
  const [modalDescuentoMasivoAbierto, setModalDescuentoMasivoAbierto] = useState(false);

  const empresaQ = useQuery({ queryKey: ['empresa'], queryFn: () => empresaApi.obtener().then(r => r.data) });
  const metodosPago = empresaQ.data?.metodosPago || [];

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
        <div style={{ display: 'flex', gap: 8 }}>
          {puedeDescuentoMasivo && (
            <Btn variant="ghost" icon={<Percent size={14} />} onClick={() => setModalDescuentoMasivoAbierto(true)}>
              Descuento masivo
            </Btn>
          )}
          <Btn variant="ghost" icon={<RefreshCw size={14} />} onClick={() => setModalCargosAbierto(true)}>
            Generar cargos del mes
          </Btn>
        </div>
      </div>

      <ModalGenerarCargos
        open={modalCargosAbierto}
        onClose={() => setModalCargosAbierto(false)}
        onGenerado={() => {
          qc.invalidateQueries({ queryKey: ['cargos-contrato'] });
          qc.invalidateQueries({ queryKey: ['contratos'] });
          qc.invalidateQueries({ queryKey: ['cargos-preview'] });
        }}
      />

      <ModalDescuentoMasivo
        open={modalDescuentoMasivoAbierto}
        onClose={() => setModalDescuentoMasivoAbierto(false)}
        onAplicado={() => {
          qc.invalidateQueries({ queryKey: ['cargos-contrato'] });
          qc.invalidateQueries({ queryKey: ['contratos'] });
        }}
      />

      <ReporteCaja />

      <div className="resp-toolbar" style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const activo = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: '1px solid', background: activo ? '#1E3A8A' : '#fff', color: activo ? '#fff' : '#5A7A9A',
              borderColor: activo ? '#1E3A8A' : 'var(--border-2)',
            }}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === 'deudores' && (
          <TabDeudores metodosPago={metodosPago} onSeleccionarContrato={(c) => { setContrato(c); setTab('cobro'); }} />
        )}
        {tab === 'cobro' && <TabRegistrarCobro contrato={contrato} setContrato={setContrato} />}
        {tab === 'egresos' && <TabEgresos />}
        {tab === 'historial' && <TabHistorial />}
      </div>
    </div>
  );
}
