import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PiggyBank, ChevronDown, FileSpreadsheet, X } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';
import api, { contratosApi } from '../services/api.js';
import { tipoLabel } from '../utils/tiposOrden';
import { Modal, Btn } from '../components/ui';

const ESTADOS_ORDEN = {
  PENDIENTE:  { label: 'Pendiente',  bg: '#FEF3C7', color: '#92400E' },
  ASIGNADA:   { label: 'Asignada',   bg: '#DBEAFE', color: '#1D4ED8' },
  EN_PROCESO: { label: 'En proceso', bg: '#DBEAFE', color: '#1D4ED8' },
  COMPLETADA: { label: 'Completada', bg: '#DCFCE7', color: '#15803D' },
  CANCELADA:  { label: 'Cancelada',  bg: '#FEE2E2', color: '#B91C1C' },
};

function fmtFechaCorta(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── API ──────────────────────────────────────────────────────────
const dashApi = {
  kpis:     ()        => api.get('/dashboard/kpis').then(r => r.data.data),
  analitica:(periodo) => api.get(`/dashboard/analitica?periodo=${periodo}`).then(r => r.data.data),
  historial:()        => api.get('/dashboard/historial').then(r => r.data.data),
};

const fmt = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n ?? 0);

const CSS = `
  .dash-grid-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
  .dash-historial-table {
    width: 100%;
    border-collapse: collapse;
  }
  .dash-historial-table th,
  .dash-historial-table td {
    white-space: nowrap;
  }
  .dash-col-desc { display: table-cell; }
  .dash-col-hora { display: table-cell; }

  @media (max-width: 768px) {
    .dash-grid-kpis {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .dash-col-desc { display: none; }
    .dash-col-hora { display: none; }
    .dash-chart-yaxis { display: none; }
  }

  @media (max-width: 480px) {
    .dash-grid-kpis {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
  }
`;

// ─── KPI Card destacada ───────────────────────────────────────
function KPIDestacada({ label, value, diff, icon: Icon, masked }) {
  const pos = diff >= 0;
  const [reveal, setReveal] = useState(false);
  return (
    <div
      onMouseEnter={() => masked && setReveal(true)}
      onMouseLeave={() => masked && setReveal(false)}
      style={{
        background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
        borderRadius: 16, padding: '18px 20px', color: '#fff',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 100, position: 'relative', overflow: 'hidden',
        cursor: masked ? 'pointer' : 'default',
        userSelect: 'none',
      }}>
      <div style={{ position: 'absolute', top: 14, right: 14, opacity: .2 }}>
        <Icon size={36} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: .85, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
        {masked && !reveal ? '******' : value}
      </div>
      <div style={{ fontSize: 10, marginTop: 6, color: pos ? '#86EFAC' : '#FCA5A5' }}>
        {masked && !reveal ? 'Pasa el cursor para ver' : (pos ? '+ que ayer' : '− que ayer') + ' ↗'}
      </div>
    </div>
  );
}

// ─── KPI Card normal ─────────────────────────────────────────
function KPICard({ label, value, diff, diffLabel, icon: Icon, masked }) {
  const pos = diff >= 0;
  const [reveal, setReveal] = useState(false);
  return (
    <div
      onMouseEnter={() => masked && setReveal(true)}
      onMouseLeave={() => masked && setReveal(false)}
      style={{
        background: '#fff', borderRadius: 16, padding: '18px 20px',
        border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        minHeight: 100, position: 'relative', overflow: 'hidden',
        cursor: masked ? 'pointer' : 'default',
        userSelect: 'none',
      }}>
      <div style={{ position: 'absolute', top: 14, right: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color="#2563EB" />
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, paddingRight: 36 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
        {masked && !reveal ? '******' : value}
      </div>
      <div style={{ fontSize: 10, marginTop: 6, color: pos ? '#15803D' : '#DC2626' }}>
        {masked && !reveal ? 'Pasa el cursor para ver' : (pos ? '+' : '') + diffLabel + ' ↗'}
      </div>
    </div>
  );
}

// ─── Tooltip personalizado ────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1E293B', borderRadius: 10, padding: '8px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
        {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(payload[0].value)}
      </p>
    </div>
  );
}

// ─── Gráfico de Morosos (clientes con deuda, agrupados por meses pendientes) ──
const BUCKETS_MOROSOS = [
  { key: '1', label: '1 mes',       color: '#16A34A', bg: '#F0FDF4', filtro: c => c.mesesPendientes === 1 },
  { key: '2', label: '2 meses',     color: '#D97706', bg: '#FFFBEB', filtro: c => c.mesesPendientes === 2 },
  { key: '3+', label: '3+ meses',   color: '#DC2626', bg: '#FEF2F2', filtro: c => c.mesesPendientes >= 3 },
];

function exportarExcelSimple(rows, columnas, nombreArchivo) {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet(rows);
    if (columnas) ws['!cols'] = columnas.map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    XLSX.writeFile(wb, nombreArchivo);
  });
}

function exportarMorososExcel(clientes, bucketLabel) {
  const rows = clientes.map(c => ({
    'Contrato': c.numero,
    'Cliente': `${c.cliente?.nombres || ''} ${c.cliente?.apellidos || ''}`.trim(),
    'DNI/RUC': c.cliente?.dniRuc || '',
    'Celular': c.cliente?.telefono || '',
    'Dirección': c.direccion || '',
    'Meses pendientes': c.mesesPendientes,
    'Deuda (S/)': Number(c.deudaPendiente),
    'Vencido': c.deudaVencida ? 'Sí' : 'No',
    'Día de corte': c.diaCorte || '',
  }));
  exportarExcelSimple(rows, [14, 24, 12, 12, 26, 16, 12, 10, 12], `morosos_${bucketLabel.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function ModalMorosos({ bucket, clientes, onClose }) {
  if (!bucket) return null;
  return (
    <Modal open={Boolean(bucket)} onClose={onClose} title={`Morosos · ${bucket.label}`} subtitle={`${clientes.length} cliente(s)`} width={720}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Btn size="sm" icon={<FileSpreadsheet size={13} />} disabled={clientes.length === 0} onClick={() => exportarMorososExcel(clientes, bucket.label)}>
          Exportar Excel
        </Btn>
      </div>
      {clientes.length === 0 ? (
        <p style={{ fontSize: 13, color: '#64748B' }}>No hay clientes en este grupo.</p>
      ) : (
        <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #E2ECF4', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', position: 'sticky', top: 0 }}>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>Contrato</th>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>Cliente</th>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>DNI/RUC</th>
                <th style={{ textAlign: 'left', padding: '8px 10px' }}>Celular</th>
                <th style={{ textAlign: 'center', padding: '8px 10px' }}>Meses</th>
                <th style={{ textAlign: 'right', padding: '8px 10px' }}>Deuda</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '7px 10px', fontFamily: 'monospace' }}>{c.numero}</td>
                  <td style={{ padding: '7px 10px' }}>{c.cliente?.nombres} {c.cliente?.apellidos}</td>
                  <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#64748B' }}>{c.cliente?.dniRuc || '—'}</td>
                  <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#64748B' }}>{c.cliente?.telefono || '—'}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>{c.mesesPendientes}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: c.deudaVencida ? '#DC2626' : '#0D1B2A' }}>
                    S/ {Number(c.deudaPendiente).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function GraficaMorosos() {
  const [bucketKey, setBucketKey] = useState(null);

  const contratosQ = useQuery({
    queryKey: ['contratos'],
    queryFn: () => contratosApi.listar().then(r => r.data),
  });

  const deudores = useMemo(() => (contratosQ.data || []).filter(c => c.deudaPendiente > 0), [contratosQ.data]);

  const chartData = useMemo(() => BUCKETS_MOROSOS.map(b => ({
    key: b.key,
    label: b.label,
    color: b.color,
    cantidad: deudores.filter(b.filtro).length,
  })), [deudores]);

  const bucketActivo = BUCKETS_MOROSOS.find(b => b.key === bucketKey) || null;
  const clientesBucket = useMemo(() => bucketActivo ? deudores.filter(bucketActivo.filtro) : [], [bucketActivo, deudores]);

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>Morosos</h3>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{deudores.length} cliente(s) con deuda</span>
      </div>
      <p style={{ fontSize: 11.5, color: '#94A3B8', margin: '2px 0 8px' }}>Clic en una barra para ver el detalle</p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 18, right: 10, left: 0, bottom: 5 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
          <YAxis hide allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: '#1E293B', borderRadius: 10, padding: '8px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 4px' }}>{d.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{d.cantidad} cliente(s)</p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="cantidad" maxBarSize={70} cursor="pointer"
            isAnimationActive={false}
            onClick={(d) => d?.cantidad > 0 && setBucketKey(d.key)}
            shape={(props) => {
              const { x, y, width, height, payload } = props;
              const r = Math.min(6, width / 2, height || 0);
              const h = Math.max(height, 0);
              const path = h <= r
                ? `M${x},${y + h} L${x},${y} L${x + width},${y} L${x + width},${y + h} Z`
                : `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + h} Z`;
              return <path d={path} fill={payload.color} />;
            }}
          >
            <LabelList dataKey="cantidad" position="top" style={{ fontSize: 13, fontWeight: 800, fill: '#0D1B2A' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
        {BUCKETS_MOROSOS.map(b => (
          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
            <span style={{ fontSize: 11, color: '#64748B' }}>{b.label}</span>
          </div>
        ))}
      </div>

      <ModalMorosos bucket={bucketActivo} clientes={clientesBucket} onClose={() => setBucketKey(null)} />
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────
export default function Dashboard() {
  const [periodo, setPeriodo] = useState('7d');

  const { data: kpis }      = useQuery({ queryKey: ['kpis'],              queryFn: dashApi.kpis,                    refetchInterval: 60000 });
  const { data: analitica } = useQuery({ queryKey: ['analitica', periodo], queryFn: () => dashApi.analitica(periodo), refetchInterval: 60000 });
  const { data: historial } = useQuery({ queryKey: ['historial'],          queryFn: dashApi.historial,                refetchInterval: 60000 });

  const chartData = analitica || [];

  return (
    <>
    <style>{CSS}</style>
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── KPI Cards ── */}
      <div className="dash-grid-kpis">
        <KPIDestacada label="Clientes con deuda"  value={kpis?.clientesConDeuda ?? 0} diff={1} icon={PiggyBank} />
        <KPICard      label="Deuda total"         value={fmt(kpis?.deudaTotal)}       diff={-1} diffLabel="pendiente"   icon={PiggyBank} />
        <KPICard      label="Recaudado del mes"   value={fmt(kpis?.recaudadoMes)}     diff={1}  diffLabel="este mes"     icon={PiggyBank} />
        <KPICard      label="Contratos activos"   value={kpis?.contratosActivos ?? 0} diff={1}  diffLabel="activos"      icon={PiggyBank} />
      </div>

      {/* ── Gráfico analítica ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>Analítica</h3>
          <div style={{ position: 'relative' }}>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)}
              style={{ appearance: 'none', padding: '6px 28px 6px 12px', borderRadius: 10, border: '1px solid #E2ECF4', background: '#F8FAFC', fontSize: 12, fontWeight: 600, color: '#1E293B', cursor: 'pointer', outline: 'none' }}>
              <option value="3d">3 Días</option>
              <option value="7d">7 Días</option>
              <option value="30d">1 Mes</option>
              <option value="6m">6 Meses</option>
              <option value="1a">1 Año</option>
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }} />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={v => v >= 1000 ? `S/${(v / 1000).toFixed(1)}k` : `S/${v}`}
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              axisLine={false} tickLine={false}
              width={48}
              className="dash-chart-yaxis"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="monto"
              stroke="#2563EB" strokeWidth={2.5}
              fill="url(#gradBlue)"
              dot={false} activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Gráfico de morosos ── */}
      <GraficaMorosos />

      {/* ── Últimas 5 Órdenes ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>Últimas órdenes</h3>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>Últimas 5</span>
        </div>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="dash-historial-table">
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #F1F5F9' }}>Nº Orden</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #F1F5F9' }}>Cliente</th>
                <th className="dash-col-desc" style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #F1F5F9' }}>Servicio</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #F1F5F9' }}>Técnico</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #F1F5F9' }}>Estado</th>
                <th className="dash-col-hora" style={{ padding: '9px 14px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #F1F5F9' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(historial || []).map((h, i) => {
                const estado = ESTADOS_ORDEN[h.estado] || { label: h.estado, bg: '#F1F5F9', color: '#334155' };
                return (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '2px 7px', borderRadius: 6 }}>{h.numeroOrden}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#0D1B2A', whiteSpace: 'nowrap' }}>{h.cliente}</td>
                    <td className="dash-col-desc" style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipoLabel(h.tipoOrden)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>{h.tecnico}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: estado.bg, color: estado.color, padding: '2px 8px', borderRadius: 20 }}>{estado.label}</span>
                    </td>
                    <td className="dash-col-hora" style={{ padding: '10px 14px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', textAlign: 'right' }}>{fmtFechaCorta(h.fecha)}</td>
                  </tr>
                );
              })}
              {!historial?.length && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: '#94A3B8', fontSize: 13 }}>
                    No hay órdenes registradas aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
    </>
  );
}
