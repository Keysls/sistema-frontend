import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { inventarioApi } from '../../services/api';
import { Spinner, Btn, Modal as UIModal } from '../../components/ui';

const CSS = `
  .arep-stats   { flex-wrap: wrap; }
  .arep-filters { flex-wrap: wrap; }
  .arep-row     { display: grid; grid-template-columns: 2fr 90px 80px 1.5fr; }
  .arep-cards   { display: none; }

  @media (max-width: 1080px) {
    .arep-stats > button { flex: 1 1 calc(50% - 5px) !important; min-width: unset !important; }
    .arep-filters { flex-direction: column !important; }
    .arep-filters > * { width: 100% !important; min-width: unset !important; }
    .arep-row   { display: none !important; }
    .arep-cards { display: flex !important; flex-direction: column; gap: 6px; padding: 8px 12px; }
  }

  .arep-card {
    background: var(--bg-3);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .arep-export-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-2);
    color: var(--txt);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background .15s, border-color .15s;
  }
  .arep-export-btn:hover {
    background: var(--bg-3, #e8f0fe);
    border-color: #2563EB;
    color: #2563EB;
  }
  .arep-export-btn.primary {
    background: #2563EB;
    border-color: #2563EB;
    color: #fff;
  }
  .arep-export-btn.primary:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
    color: #fff;
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('arep-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'arep-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const TIPOS = {
  ENTRADA: { label: 'Entrada', color: '#3b6d11', bg: '#eaf3de', border: '#c0dd97' },
  SALIDA:  { label: 'Salida',  color: '#a32d2d', bg: '#fcebeb', border: '#f7c1c1' },
};

function TipoBadge({ tipo }) {
  const meta = TIPOS[tipo] || { label: tipo, color: '#5f5e5a', bg: '#f1efe8', border: '#d3d1c7' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: meta.bg, color: meta.color, border: `0.5px solid ${meta.border}` }}>
      {meta.label}
    </span>
  );
}

function StatCard({ tipo, count, active, onClick }) {
  const meta = TIPOS[tipo] || { label: tipo, color: '#5f5e5a', bg: 'var(--bg-2)' };
  return (
    <button onClick={onClick} style={{ flex: 1, minWidth: 100, background: active ? meta.bg : 'var(--bg-2)', border: `1.5px solid ${active ? meta.border : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: active ? meta.color : 'var(--txt)', lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 11, color: active ? meta.color : 'var(--txt-3)', marginTop: 4 }}>{meta.label}</div>
    </button>
  );
}

function fmtDay(d) {
  return new Date(d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtHora(d) {
  return new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

function fmtDatetime(d) {
  const date = new Date(d);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + fmtHora(date);
}

function movimientosToRows(movimientos) {
  return movimientos.map(m => ({
    'Fecha y hora':  fmtDatetime(m.createdAt),
    'Producto':      m.producto?.nombre || '—',
    'Código':        m.producto?.codigo || '—',
    'Tipo':          TIPOS[m.tipo]?.label || m.tipo || '—',
    'Cantidad':      m.cantidad ?? '',
    'Unidad':        m.producto?.unidad || '—',
    'Proveedor':     m.proveedor || '—',
    'Motivo':        m.motivo || '—',
  }));
}

function exportToExcel(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 30 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  XLSX.writeFile(wb, filename);
}

function ExportModal({ movimientos, onClose }) {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tiposSeleccionados, setTiposSeleccionados] = useState(new Set());

  function toggleTipo(tipo) {
    setTiposSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  }

  const preview = useMemo(() => {
    return movimientos.filter(m => {
      if (fechaDesde) {
        const d = new Date(m.createdAt); d.setHours(0, 0, 0, 0);
        if (d < new Date(fechaDesde + 'T00:00:00')) return false;
      }
      if (fechaHasta) {
        const d = new Date(m.createdAt); d.setHours(0, 0, 0, 0);
        if (d > new Date(fechaHasta + 'T00:00:00')) return false;
      }
      if (tiposSeleccionados.size > 0 && !tiposSeleccionados.has(m.tipo)) return false;
      return true;
    });
  }, [movimientos, fechaDesde, fechaHasta, tiposSeleccionados]);

  function handleExport() {
    if (preview.length === 0) return;
    const rows = movimientosToRows(preview);
    const parts = ['movimientos'];
    if (fechaDesde || fechaHasta) parts.push(`${fechaDesde || ''}a${fechaHasta || ''}`);
    if (tiposSeleccionados.size > 0) parts.push([...tiposSeleccionados].map(t => TIPOS[t]?.label || t).join('-'));
    exportToExcel(rows, parts.join('_').replace(/\s+/g, '-') + '.xlsx');
    onClose();
  }

  return (
    <UIModal open={true} onClose={onClose} title="Exportar a Excel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rango de fechas
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 4 }}>Desde</div>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                max={fechaHasta || undefined}
                style={{ width: '100%', height: 36, padding: '0 11px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--txt-3)', marginBottom: 4 }}>Hasta</div>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                min={fechaDesde || undefined}
                style={{ width: '100%', height: 36, padding: '0 11px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tipo de movimiento
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              onClick={() => setTiposSeleccionados(new Set())}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: '1.5px solid', transition: 'all .12s', userSelect: 'none',
                ...(tiposSeleccionados.size === 0
                  ? { background: '#EFF6FF', borderColor: '#93c5fd', color: '#2563EB' }
                  : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--txt-3)' })
              }}>
              Todos
            </button>
            {Object.entries(TIPOS).map(([tipo, meta]) => {
              const active = tiposSeleccionados.has(tipo);
              return (
                <button key={tipo} onClick={() => toggleTipo(tipo)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: '1.5px solid', transition: 'all .12s', userSelect: 'none',
                    ...(active
                      ? { background: meta.bg, borderColor: meta.border, color: meta.color }
                      : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--txt-3)' })
                  }}>
                  {active ? '✓ ' : ''}{meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#2563EB', fontWeight: 800, fontSize: 16 }}>{preview.length}</span>
          <span>registro{preview.length !== 1 ? 's' : ''} se exportarán con estos filtros</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={handleExport} disabled={preview.length === 0} icon={<FileDown size={15} />}>
            Exportar ({preview.length})
          </Btn>
        </div>

      </div>
    </UIModal>
  );
}

export default function AlmacenReportes() {
  const [q, setQ] = useState('');
  const [activeTipo, setActiveTipo] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['almacen-reportes-movimientos'],
    queryFn: () => inventarioApi.movimientosTodos().then(r => r.data),
    staleTime: 30000,
  });

  const movimientos = data || [];

  const counts = useMemo(() => {
    const c = {};
    movimientos.forEach(m => { c[m.tipo] = (c[m.tipo] || 0) + 1; });
    return c;
  }, [movimientos]);

  const filtered = useMemo(() => {
    const search = q.toLowerCase();
    return movimientos.filter(m => {
      const matchTipo = !activeTipo || m.tipo === activeTipo;
      const matchQ = !search || [m.producto?.nombre, m.producto?.codigo, m.motivo, m.proveedor]
        .some(v => v?.toLowerCase().includes(search));
      return matchTipo && matchQ;
    });
  }, [movimientos, q, activeTipo]);

  const byDay = useMemo(() => {
    const map = new Map();
    filtered.forEach(m => {
      const day = fmtDay(m.createdAt);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(m);
    });
    return map;
  }, [filtered]);

  function handleExportTodo() {
    const rows = movimientosToRows(movimientos);
    exportToExcel(rows, `movimientos_almacen_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (isLoading) return (
    <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size={28} />
    </div>
  );

  return (
    <div style={{ padding: 28 }} className="animate-fade">
      {showExportModal && (
        <ExportModal movimientos={movimientos} onClose={() => setShowExportModal(false)} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Reportes</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--txt-2)' }}>Historial de movimientos de almacén</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="arep-export-btn" onClick={() => setShowExportModal(true)}>
            <Download size={14} />
            Exportar filtrado
          </button>
          <button className="arep-export-btn primary" onClick={handleExportTodo} title="Exportar todo el historial sin filtros">
            <FileDown size={14} />
            Exportar todo ({movimientos.length})
          </button>
        </div>
      </div>

      <div className="arep-stats" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {Object.entries(TIPOS).map(([tipo]) => (
          <StatCard key={tipo} tipo={tipo} count={counts[tipo] || 0}
            active={activeTipo === tipo} onClick={() => setActiveTipo(t => t === tipo ? '' : tipo)} />
        ))}
      </div>

      <div className="arep-filters" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto, código, proveedor, motivo..."
            style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={activeTipo} onChange={e => setActiveTipo(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', minWidth: 160 }}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 16 }}>
        <strong style={{ color: 'var(--txt)' }}>{filtered.length}</strong> registro{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== movimientos.length && (
          <span style={{ marginLeft: 6, color: 'var(--txt-3)' }}>de {movimientos.length} totales</span>
        )}
      </p>

      {[...byDay.entries()].map(([day, items]) => (
        <div key={day} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{day}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>{items.length} mov.</span>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)' }}>Movimientos del día</span>
              </div>

              {items.map((m, j) => (
                <div key={m.id} className="arep-row" style={{ gap: 12, padding: '11px 16px', fontSize: 13, alignItems: 'center', borderTop: j > 0 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: 'var(--txt)', fontWeight: 600 }}>
                    {m.producto?.nombre}
                    {m.producto?.codigo && <span style={{ marginLeft: 8, color: 'var(--txt-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{m.producto.codigo}</span>}
                  </span>
                  <TipoBadge tipo={m.tipo} />
                  <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--txt)' }}>{m.cantidad}</span>
                  <span style={{ color: 'var(--txt-3)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>{fmtHora(m.createdAt)}</span>
                    {m.proveedor && <span style={{ color: '#3b6d11', fontWeight: 600 }}>· {m.proveedor}</span>}
                    {m.motivo && <span>· {m.motivo}</span>}
                  </span>
                </div>
              ))}

              <div className="arep-cards">
                {items.map(m => (
                  <div key={m.id} className="arep-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.producto?.nombre}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: 'var(--txt)', flexShrink: 0 }}>×{m.cantidad}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TipoBadge tipo={m.tipo} />
                      <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{fmtHora(m.createdAt)}</span>
                    </div>
                    {m.proveedor && <div style={{ fontSize: 11, color: '#3b6d11', fontWeight: 600 }}>{m.proveedor}</div>}
                    {m.motivo && <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{m.motivo}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {!isLoading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <p style={{ color: 'var(--txt-3)', fontSize: 13 }}>Sin movimientos registrados</p>
        </div>
      )}
    </div>
  );
}
