import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Check, FileDown, MoreHorizontal, Plus, Search, TrendingDown, X,
} from 'lucide-react';
import { inventarioApi, productosApi } from '../../services/api';
import { Spinner, Btn, Input, Select, Badge, Modal as UIModal } from '../../components/ui';

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const CSS = `
  .ainv-toolbar        { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: nowrap; }
  .ainv-toolbar-search { flex: 1 1 auto; min-width: 120px; }
  .ainv-toolbar-btns   { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; flex-shrink: 0; margin-left: auto; }
  .ainv-menu-wrap      { position: relative; }
  .ainv-menu-dropdown  { position: absolute; top: calc(100% + 6px); right: 0; min-width: 220px; z-index: 50; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,0.18); overflow: hidden; }
  .ainv-menu-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 10px 14px; border: none; border-bottom: 1px solid var(--border);
    background: transparent; cursor: pointer; font-size: 13px; font-weight: 600;
    color: var(--txt); text-align: left; white-space: nowrap; transition: background .12s;
  }
  .ainv-menu-item:hover:not(:disabled) { background: var(--bg-3); }
  .ainv-menu-item:last-child { border-bottom: none; }
  .ainv-menu-item:disabled   { opacity: 0.5; cursor: not-allowed; }
  .ainv-table   { display: block; }
  .ainv-cards   { display: none; }

  @media (max-width: 1080px) {
    .ainv-toolbar        { flex-direction: column !important; align-items: stretch; }
    .ainv-toolbar-search { width: 100%; }
    .ainv-toolbar-btns   { width: 100%; }
    .ainv-toolbar-btns > * { flex: 1; justify-content: center; }
    .ainv-menu-dropdown  { left: 0; right: 0; width: 100%; min-width: 0; }
    .ainv-table { display: none !important; }
    .ainv-cards { display: flex !important; flex-direction: column; gap: 10px; padding: 10px; }
  }

  .ainv-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
    padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
  }
  .ainv-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .ainv-row-hover:hover { background: var(--bg-3); }
`;
if (typeof document !== 'undefined' && !document.getElementById('ainv-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'ainv-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const dateInputStyle = {
  width: '100%', padding: '9px 12px', background: 'var(--bg-3)',
  border: '1px solid var(--border-2)', borderRadius: 8,
  color: 'var(--txt)', fontSize: 13, outline: 'none',
};

const CATEGORIA_COLORS = {
  'rollo':           { bg: '#E6F1FB', color: '#0C447C' },
  'pasivos':         { bg: '#EEEDFE', color: '#3C3489' },
  'infraestructura': { bg: '#FAEEDA', color: '#633806' },
  'activos':         { bg: '#E1F5EE', color: '#085041' },
  'onu':             { bg: '#E1F5EE', color: '#085041' },
  'ferreteria':      { bg: '#FDECEA', color: '#8A2C1F' },
  'herramientas':    { bg: '#E8ECFB', color: '#2F3F8C' },
  'epp':             { bg: '#FEF3C7', color: '#7A5B06' },
  'equipos':         { bg: '#E0F2FE', color: '#075985' },
};
function categoriaBadgeStyle(cat) {
  const key = (cat || '').toLowerCase();
  for (const [k, v] of Object.entries(CATEGORIA_COLORS)) {
    if (key.includes(k)) return v;
  }
  return { bg: 'var(--bg-3)', color: 'var(--txt-2)' };
}

function StockBar({ stock, minimo }) {
  if (!minimo) return <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>{stock}</span>;
  const low  = stock <= minimo;
  const warn = stock <= minimo * 1.5;
  const color = low ? '#A32D2D' : warn ? '#854F0B' : '#3B6D11';
  return <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color }}>{stock}</span>;
}

function MetrosCell({ p }) {
  if (!p.esMedible || !p.metrosPorUnidad) return <span style={{ color: 'var(--txt-3)', fontSize: 13 }}>—</span>;
  const metros = p.metrosDisponibles || 0;
  const minimoMetros = (p.stockMinimo || 0) * p.metrosPorUnidad;
  const low  = minimoMetros > 0 && metros <= minimoMetros;
  const warn = minimoMetros > 0 && metros <= minimoMetros * 1.5;
  const color = metros === 0 ? '#A32D2D' : low ? '#A32D2D' : warn ? '#854F0B' : '#185FA5';
  return (
    <div>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color }}>
        {metros.toLocaleString()}m
      </span>
      <div style={{ fontSize: 10, color: 'var(--txt-3)', marginTop: 2 }}>
        {p.metrosPorUnidad.toLocaleString()}m/{p.unidad || 'u'}
      </div>
    </div>
  );
}

function ProductSearch({ label, search, setSearch, products, selected, onAdd }) {
  const selectedIds = selected.map(i => String(i.producto_id));
  const results = search
    ? products.filter(p => !selectedIds.includes(String(p.id)) && `${p.nombre} ${p.codigo || ''} ${p.categoria || ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 38, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' }}>
        <Search size={16} color="var(--txt-3)" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o código..." style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: 'var(--txt)' }} />
      </div>
      {results.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 6, maxHeight: 220, overflowY: 'auto', background: 'var(--bg-card)' }}>
          {results.map(p => (
            <button key={p.id} type="button" onClick={() => { onAdd(p); setSearch(''); }}
              style={{ width: '100%', border: 0, background: 'transparent', padding: '9px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', borderBottom: '1px solid var(--border)', transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span><strong>{p.nombre}</strong>{p.codigo && <span style={{ marginLeft: 8, color: 'var(--txt-3)', fontSize: 12 }}>{p.codigo}</span>}</span>
              <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>disp: <strong>{p.stockTotal}</strong></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemsList({ productos, items, setItems, showDisponible = true }) {
  const update = (idx, key, value) => setItems(items.map((it, i) => i === idx ? { ...it, [key]: value } : it));
  const remove = idx => setItems(items.filter((_, i) => i !== idx));
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Productos seleccionados ({items.length})</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 && <div style={{ color: 'var(--txt-3)', fontSize: 13, padding: '8px 0' }}>Busca y selecciona productos.</div>}
        {items.map((item, idx) => {
          const prod = productos.find(p => String(p.id) === String(item.producto_id));
          return (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8, alignItems: 'center', padding: 8, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-3)' }}>
              <div>
                <strong style={{ fontSize: 13 }}>{prod?.nombre || 'Producto'}</strong>
                <div style={{ color: 'var(--txt-3)', fontSize: 11 }}>{prod?.codigo || '—'}{showDisponible ? ` · disp. ${prod?.stockTotal ?? 0}` : ''}</div>
              </div>
              <input
                style={{ height: 34, border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px', background: 'var(--bg-2)', color: 'var(--txt)', fontSize: 13 }}
                type="number" min="1" placeholder="Cantidad"
                value={item.cantidad} onChange={e => update(idx, 'cantidad', e.target.value)}
              />
              <Btn variant="danger" size="sm" onClick={() => remove(idx)}><X size={15} /></Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AlmacenInventario() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const qDebounced = useDebounce(q);
  const [modal, setModal] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuAbierto) return;
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false); };
    const handleKey = (e) => { if (e.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuAbierto]);

  const hoy = new Date().toISOString().split('T')[0];

  const [entrada, setEntrada] = useState({ proveedor: '', motivo: '', items: [], fecha: hoy });
  const [directa, setDirecta] = useState({ motivo: '', items: [], fecha: hoy });
  const [entradaSearch, setEntradaSearch] = useState('');
  const [directaSearch, setDirectaSearch] = useState('');

  const inventarioQ = useQuery({
    queryKey: ['inventario-productos', qDebounced],
    queryFn: () => inventarioApi.productos({ q: qDebounced || undefined }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const catalogoQ = useQuery({
    queryKey: ['productos-catalogo-completo'],
    queryFn: () => productosApi.catalogo({ limit: 1000 }).then(r => r.data.data),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['inventario-productos'] });
    qc.invalidateQueries({ queryKey: ['productos-catalogo-completo'] });
    qc.invalidateQueries({ queryKey: ['movimientos'] });
  };

  const entradaItemsValidos = entrada.items.filter(i => i.producto_id && Number(i.cantidad) > 0);
  const directaItemsValidos = directa.items.filter(i => i.producto_id && Number(i.cantidad) > 0);

  const entradaM = useMutation({
    mutationFn: () => Promise.all(entradaItemsValidos.map(i => inventarioApi.entrada({
      productoId: i.producto_id, cantidad: i.cantidad,
      proveedor: entrada.proveedor || null, motivo: entrada.motivo || null,
      fecha: entrada.fecha || null,
    }))),
    onSuccess: () => { toast.success('Entrada registrada'); setEntrada({ proveedor: '', motivo: '', items: [], fecha: hoy }); setEntradaSearch(''); setModal(null); refresh(); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la entrada'),
  });

  const directaM = useMutation({
    mutationFn: () => Promise.all(directaItemsValidos.map(i => inventarioApi.salida({
      productoId: i.producto_id, cantidad: i.cantidad, motivo: directa.motivo,
      fecha: directa.fecha || null,
    }))),
    onSuccess: () => { toast.success('Salida directa registrada'); setDirecta({ motivo: '', items: [], fecha: hoy }); setDirectaSearch(''); setModal(null); refresh(); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo registrar la salida'),
  });

  const rows = inventarioQ.data || [];
  const catalogo = catalogoQ.data || [];
  const hayMedibles = rows.some(p => p.esMedible);

  const exportarExcel = () => {
    const datos = rows.map(p => {
      const metros = p.esMedible && p.metrosPorUnidad ? (p.metrosDisponibles || 0) : null;
      const low = p.stockMinimo > 0 && p.stockTotal <= p.stockMinimo;
      return {
        'Código': p.codigo || '—', 'Producto': p.nombre, 'Categoría': p.categoria || '—',
        'Unidad': p.unidad || '—', 'Stock': p.stockTotal,
        'Metros disponibles': metros !== null ? metros : '—',
        'Estado': low ? 'Bajo stock' : 'Disponible',
      };
    });
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(datos);
      ws['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      XLSX.writeFile(wb, `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  };

  if (inventarioQ.isLoading && !inventarioQ.data) return (
    <div style={{ padding: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size={28} />
    </div>
  );

  return (
    <div style={{ padding: 28 }} className="animate-fade">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--txt)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Inventario</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--txt-2)' }}>Stock del almacén general</p>
        </div>
      </div>

      <div className="ainv-toolbar">
        <div className="ainv-toolbar-search" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' }}>
          <Search size={14} color="var(--txt-3)" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto o código..." style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: 'var(--txt)' }} />
        </div>

        <div className="ainv-toolbar-btns">
          <Btn
            onClick={() => { setEntrada({ proveedor: '', motivo: '', items: [], fecha: hoy }); setEntradaSearch(''); setModal('entrada'); }}
            icon={<Plus size={15} />}
            style={{ background: '#fff', color: '#000', border: '1px solid var(--border-2)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F2F2F2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            Registrar entrada
          </Btn>

          <div className="ainv-menu-wrap" ref={menuRef}>
            <Btn
              onClick={() => setMenuAbierto(v => !v)}
              icon={<MoreHorizontal size={15} />}
              style={{ background: '#fff', color: '#000', border: '1px solid var(--border-2)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F2F2F2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              Más
            </Btn>

            {menuAbierto && (
              <div className="ainv-menu-dropdown">
                <button className="ainv-menu-item" onClick={() => { setMenuAbierto(false); setDirecta({ motivo: '', items: [], fecha: hoy }); setDirectaSearch(''); setModal('directa'); }}>
                  <TrendingDown size={15} style={{ color: '#A32D2D' }} /> Salida directa
                </button>
                <button className="ainv-menu-item" disabled={rows.length === 0} onClick={() => { setMenuAbierto(false); exportarExcel(); }}>
                  <FileDown size={15} /> Exportar Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div className="ainv-table" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                {[
                  { label: 'CÓDIGO',    w: '110px', align: 'left'   },
                  { label: 'PRODUCTO',  w: undefined, align: 'left' },
                  { label: 'CATEGORÍA', w: '140px', align: 'left'   },
                  { label: 'UNIDAD',    w: '90px',  align: 'center' },
                  { label: 'STOCK',     w: '80px',  align: 'right'  },
                  ...(hayMedibles ? [{ label: 'METROS DISP.', w: '130px', align: 'right' }] : []),
                  { label: 'ESTADO',    w: '110px', align: 'center' },
                ].map(h => (
                  <th key={h.label} style={{ padding: '10px 14px', textAlign: h.align, fontSize: 11, fontWeight: 600, color: 'var(--txt-3)', letterSpacing: '0.05em', width: h.w, whiteSpace: 'nowrap' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={hayMedibles ? 7 : 6} style={{ padding: 32, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
                    Aún no has registrado ningún movimiento. Usa "Registrar entrada" para empezar.
                  </td>
                </tr>
              ) : rows.map(p => {
                const low = p.stockMinimo > 0 && p.stockTotal <= p.stockMinimo;
                const badgeStyle = categoriaBadgeStyle(p.categoria);
                return (
                  <tr key={p.id} className="ainv-row-hover" style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>{p.codigo || '—'}</td>
                    <td style={{ padding: '12px 14px' }}><div style={{ fontWeight: 600, fontSize: 13, color: 'var(--txt)' }}>{p.nombre}</div></td>
                    <td style={{ padding: '12px 14px' }}>
                      {p.categoria
                        ? <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: badgeStyle.bg, color: badgeStyle.color }}>{p.categoria}</span>
                        : <span style={{ color: 'var(--txt-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, color: 'var(--txt-2)' }}>{p.unidad || '—'}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}><StockBar stock={p.stockTotal} minimo={p.stockMinimo} /></td>
                    {hayMedibles && <td style={{ padding: '12px 14px', textAlign: 'right' }}><MetrosCell p={p} /></td>}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {low
                        ? <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#FCEBEB', color: '#A32D2D' }}>Bajo stock</span>
                        : <span style={{ fontSize: 12, fontWeight: 600, color: '#3B6D11' }}>OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="ainv-cards">
          {rows.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>
              Aún no has registrado ningún movimiento. Usa "Registrar entrada" para empezar.
            </div>
          ) : rows.map(p => {
            const low = p.stockMinimo > 0 && p.stockTotal <= p.stockMinimo;
            const badgeStyle = categoriaBadgeStyle(p.categoria);
            return (
              <div key={p.id} className="ainv-card">
                <div className="ainv-card-top">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{p.nombre}</div>
                    {p.codigo && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{p.codigo}</span>}
                  </div>
                  {low
                    ? <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#FCEBEB', color: '#A32D2D' }}>Bajo stock</span>
                    : <span style={{ fontSize: 12, fontWeight: 600, color: '#3B6D11' }}>OK</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {p.categoria && <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: badgeStyle.bg, color: badgeStyle.color }}>{p.categoria}</span>}
                  {p.unidad && <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{p.unidad}</span>}
                  <StockBar stock={p.stockTotal} minimo={p.stockMinimo} />
                  {p.esMedible && p.metrosPorUnidad && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: (p.metrosDisponibles || 0) === 0 ? '#A32D2D' : '#185FA5', fontFamily: 'var(--font-mono)' }}>
                      {(p.metrosDisponibles || 0).toLocaleString()}m
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Registrar entrada */}
      {modal === 'entrada' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Registrar entrada">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProductSearch
              label="Buscar producto del catálogo"
              search={entradaSearch} setSearch={setEntradaSearch}
              products={catalogo} selected={entrada.items}
              onAdd={p => setEntrada({ ...entrada, items: [...entrada.items, { producto_id: String(p.id), cantidad: '' }] })}
            />
            <ItemsList productos={catalogo} items={entrada.items} setItems={items => setEntrada({ ...entrada, items })} />
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--txt-2)', fontWeight: 500 }}>Fecha de entrada</label>
              <input type="date" value={entrada.fecha} onChange={e => setEntrada({ ...entrada, fecha: e.target.value })} style={dateInputStyle} />
            </div>
            <Input label="Proveedor" value={entrada.proveedor} onChange={e => setEntrada({ ...entrada, proveedor: e.target.value })} placeholder="ej: Distribuidora XYZ" />
            <Input label="Motivo / observación" value={entrada.motivo} onChange={e => setEntrada({ ...entrada, motivo: e.target.value })} placeholder="ej: Compra mensual" />
            <Btn onClick={() => entradaM.mutate()} disabled={entradaItemsValidos.length === 0 || entradaM.isPending} loading={entradaM.isPending} icon={<Check size={15} />} style={{ background: '#16A34A', fontWeight: 700 }}>
              Registrar ({entradaItemsValidos.length})
            </Btn>
          </div>
        </UIModal>
      )}

      {/* Modal: Salida directa */}
      {modal === 'directa' && (
        <UIModal open={true} onClose={() => setModal(null)} title="Salida directa de stock">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProductSearch
              label="Buscar producto"
              search={directaSearch} setSearch={setDirectaSearch}
              products={catalogo.filter(p => p.stockTotal > 0)} selected={directa.items}
              onAdd={p => setDirecta({ ...directa, items: [...directa.items, { producto_id: String(p.id), cantidad: '' }] })}
            />
            <ItemsList productos={catalogo} items={directa.items} setItems={items => setDirecta({ ...directa, items })} />
            <div>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--txt-2)', fontWeight: 500 }}>Fecha de salida</label>
              <input type="date" value={directa.fecha} onChange={e => setDirecta({ ...directa, fecha: e.target.value })} style={dateInputStyle} />
            </div>
            <Input label="Motivo (obligatorio)" value={directa.motivo} onChange={e => setDirecta({ ...directa, motivo: e.target.value })} placeholder="ej: Entrega a técnico, uso interno, merma..." />
            <Btn onClick={() => directaM.mutate()} disabled={!directa.motivo.trim() || directaItemsValidos.length === 0 || directaM.isPending} loading={directaM.isPending} icon={<Check size={15} />} style={{ background: '#DC2626', fontWeight: 700 }}>
              Confirmar salida
            </Btn>
          </div>
        </UIModal>
      )}

    </div>
  );
}