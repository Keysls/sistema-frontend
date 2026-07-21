import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, HardHat } from 'lucide-react';
import { useTecnicoAuthStore } from '../../store/tecnicoAuth.store';

export default function LayoutTecnico({ children }) {
  const navigate = useNavigate();
  const { tecnico, logout } = useTecnicoAuthStore();

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 2000, background: '#1E3A8A', color: '#fff',
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HardHat size={20} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{tecnico?.nombre} {tecnico?.apellido}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Portal Técnico</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/tecnico/login'); }}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '8px 12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
          <LogOut size={14} /> Salir
        </button>
      </header>
      <main style={{ maxWidth: 640, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
