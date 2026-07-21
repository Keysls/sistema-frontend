import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, ClipboardList, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ordenesApi } from '../services/api';
import { Spinner } from '../components/ui';

const ESTADOS = {
  PENDIENTE:  { label: 'Pendiente',  color: '#D97706' },
  ASIGNADA:   { label: 'Asignada',   color: '#2563EB' },
  EN_PROCESO: { label: 'En proceso', color: '#7C3AED' },
  COMPLETADA: { label: 'Completada', color: '#16A34A' },
  CANCELADA:  { label: 'Cancelada',  color: '#DC2626' },
};

const SERVICIOS = { I: 'Internet', C: 'Cable', D: 'Dúo' };

function KPICard({ label, value, icon: Icon, color, bg }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-3)', paddingRight: 36 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--txt)', letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  );
}

export default function Reportes() {
  const { data, isLoading } = useQuery({
    queryKey: ['ordenes-stats'],
    queryFn: () => ordenesApi.stats().then(r => r.data),
  });

  if (isLoading) return (
    <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size={28} />
    </div>
  );

  const porEstado = data?.porEstado || {};
  const porServicio = data?.porServicio || {};
  const tecnicos = data?.tecnicos || [];
  const total = data?.total || 0;

  const dataPieEstado = Object.entries(porEstado)
    .map(([k, v]) => ({ name: ESTADOS[k]?.label || k, value: v, color: ESTADOS[k]?.color || '#94A3B8' }))
    .filter(d => d.value > 0);

  const dataServicio = Object.entries(porServicio).map(([k, v]) => ({ name: SERVICIOS[k] || k, cantidad: v }));

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
          <BarChart2 size={19} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Reportes comerciales</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Estadísticas de órdenes de servicio</p>
        </div>
      </div>

      <div className="resp-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KPICard label="Total de órdenes" value={total}                          icon={ClipboardList} color="#2563EB" bg="#EFF6FF" />
        <KPICard label="Completadas"      value={porEstado.COMPLETADA || 0}      icon={CheckCircle2}  color="#16A34A" bg="#F0FDF4" />
        <KPICard label="Pendientes"       value={(porEstado.PENDIENTE || 0) + (porEstado.ASIGNADA || 0) + (porEstado.EN_PROCESO || 0)} icon={Clock} color="#D97706" bg="#FFFBEB" />
        <KPICard label="Canceladas"       value={porEstado.CANCELADA || 0}       icon={XCircle}       color="#DC2626" bg="#FEF2F2" />
      </div>

      <div className="resp-grid-2col-charts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: '0 0 12px' }}>Distribución por estado</h3>
          {dataPieEstado.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin órdenes registradas</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={dataPieEstado} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {dataPieEstado.map(d => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconSize={9} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: '0 0 12px' }}>Órdenes por tipo de servicio</h3>
          {dataServicio.every(d => d.cantidad === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin órdenes registradas</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dataServicio} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>Órdenes por técnico</h3>
        </div>
        {tecnicos.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin órdenes asignadas a técnicos</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)' }}>
                <th style={{ padding: '9px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Técnico</th>
                <th style={{ padding: '9px 20px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total</th>
                <th style={{ padding: '9px 20px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Completadas</th>
                <th style={{ padding: '9px 20px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>% Efectividad</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{t.nombre}</td>
                  <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', color: 'var(--txt-2)' }}>{t.total}</td>
                  <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', color: '#16A34A', fontWeight: 600 }}>{t.completadas}</td>
                  <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', color: 'var(--txt-2)' }}>
                    {t.total > 0 ? Math.round((t.completadas / t.total) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
