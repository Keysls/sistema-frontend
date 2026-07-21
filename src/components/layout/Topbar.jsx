import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, UserCircle, Menu, PanelLeft } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

const TITULOS = {
  '/':                     'Dashboard',
  '/ordenes':              'Órdenes',
  '/clientes':             'Clientes',
  '/mapa':                 'Mapa de Red',
  '/reportes':             'Reportes',
  '/planes':               'Planes',
  '/perfil':               'Mi Perfil',
  '/tecnicos':             'Técnicos',
  '/secretarios':          'Secretario(a)',
  '/almacen':              'Almacén · Dashboard',
  '/almacen/inventario':   'Almacén · Inventario',
  '/almacen/devoluciones': 'Almacén · Devoluciones',
  '/almacen/reportes':     'Almacén · Reportes',
  '/almacen/catalogo':     'Almacén · Catálogo',
  '/planta-externa':       'Planta Externa',
};

function tituloDeRuta(pathname) {
  if (pathname === '/') return TITULOS['/'];
  const match = Object.keys(TITULOS)
    .filter((r) => r !== '/')
    .sort((a, b) => b.length - a.length)
    .find((r) => pathname.startsWith(r));
  return match ? TITULOS[match] : 'Panel';
}

export default function Topbar({ esMovil, colapsado, anchoSidebar, onMenuToggle, onColapsarToggle }) {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const loc = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const titulo = tituloDeRuta(loc.pathname);
  const iniciales = `${usuario?.nombre?.[0] || ''}${usuario?.apellido?.[0] || ''}`.toUpperCase();

  return (
    <header style={{
      position: 'fixed', top: 0, right: 0,
      left: esMovil ? 0 : anchoSidebar,
      height: 56, background: '#FFFFFF',
      borderBottom: '1px solid #E2ECF4',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16, zIndex: 600,
      transition: 'left .2s ease',
    }}>
      {esMovil && (
        <button
          onClick={onMenuToggle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8, color: '#5A7A9A', marginLeft: -8,
          }}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
      )}

      {!esMovil && (
        <button
          onClick={onColapsarToggle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8, color: '#5A7A9A', marginLeft: -8,
          }}
          aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
        >
          <PanelLeft size={19} />
        </button>
      )}

      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800,
        color: '#0D1B2A', flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {titulo}
      </h1>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '5px 8px 5px 6px', borderRadius: 10,
            background: showMenu ? '#F4F8FC' : 'transparent',
            border: '1px solid', borderColor: showMenu ? '#E2ECF4' : 'transparent',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: '#3B9FD4', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff',
          }}>
            {iniciales || '?'}
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1B2A' }}>
              {usuario?.nombre} {usuario?.apellido}
            </div>
            <div style={{ fontSize: 10, color: '#8AAABB' }}>{usuario?.rol}</div>
          </div>
          <ChevronDown size={14} color="#8AAABB"
            style={{ transition: 'transform .15s', transform: showMenu ? 'rotate(180deg)' : 'none' }} />
        </button>

        {showMenu && (
          <>
            <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 8,
              width: 200, background: '#FFFFFF', border: '1px solid #E2ECF4',
              borderRadius: 12, boxShadow: '0 8px 24px rgba(30,58,138,0.12)',
              overflow: 'hidden', zIndex: 1000,
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #EAF1F8' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>
                  {usuario?.nombre} {usuario?.apellido}
                </div>
                <div style={{ fontSize: 11, color: '#8AAABB', marginTop: 2 }}>{usuario?.email}</div>
              </div>
              <div style={{ padding: 6 }}>
                <button
                  onClick={() => { setShowMenu(false); navigate('/perfil'); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#5A7A9A',
                  }}
                >
                  <UserCircle size={15} /> Mi perfil
                </button>
                <button
                  onClick={() => { setShowMenu(false); logout(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#DC2626',
                  }}
                >
                  <LogOut size={15} /> Cerrar sesión
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
