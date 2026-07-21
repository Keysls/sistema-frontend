import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserCircle, KeyRound, Save, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { Btn } from '../components/ui';

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

function PasswordInput({ value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        style={{ ...campoInputStyle, paddingRight: 38 }}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#7E9BB8', display: 'flex' }}
        tabIndex={-1}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function SeccionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)' }}>
          <Icon size={16} color="var(--blue)" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: 'var(--txt-3)' }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  );
}

export default function Perfil() {
  const usuario = useAuthStore((s) => s.usuario);
  const setUsuario = useAuthStore((s) => s.setUsuario);

  const [datos, setDatos] = useState({
    nombre: usuario?.nombre || '',
    apellido: usuario?.apellido || '',
    email: usuario?.email || '',
  });

  const [pass, setPass] = useState({ actual: '', nuevo: '', confirmar: '' });

  const perfilM = useMutation({
    mutationFn: () => authApi.actualizarPerfil(datos),
    onSuccess: ({ data }) => {
      setUsuario(data.usuario);
      toast.success('Perfil actualizado');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo actualizar el perfil'),
  });

  const passwordM = useMutation({
    mutationFn: () => authApi.cambiarPassword({ passwordActual: pass.actual, passwordNuevo: pass.nuevo }),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setPass({ actual: '', nuevo: '', confirmar: '' });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo cambiar la contraseña'),
  });

  const perfilValido = datos.nombre.trim() && datos.apellido.trim() && datos.email.trim();
  const passwordValida = pass.actual && pass.nuevo.length >= 6 && pass.nuevo === pass.confirmar;

  const iniciales = `${usuario?.nombre?.[0] || ''}${usuario?.apellido?.[0] || ''}`.toUpperCase();

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24, maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#3B9FD4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {iniciales || '?'}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>{usuario?.nombre} {usuario?.apellido}</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>{usuario?.email} · {usuario?.rol}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SeccionCard icon={UserCircle} title="Datos personales" subtitle="Actualiza tu nombre, apellido y correo">
          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Campo label="Nombre" required>
              <input style={campoInputStyle} value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })} />
            </Campo>
            <Campo label="Apellido" required>
              <input style={campoInputStyle} value={datos.apellido} onChange={e => setDatos({ ...datos, apellido: e.target.value })} />
            </Campo>
          </div>
          <Campo label="Email" required>
            <input type="email" style={campoInputStyle} value={datos.email} onChange={e => setDatos({ ...datos, email: e.target.value })} />
          </Campo>
          <Btn
            disabled={!perfilValido || perfilM.isPending} loading={perfilM.isPending}
            icon={<Save size={14} />} onClick={() => perfilM.mutate()}
            style={{ alignSelf: 'flex-end' }}
          >
            Guardar cambios
          </Btn>
        </SeccionCard>

        <SeccionCard icon={KeyRound} title="Cambiar contraseña" subtitle="Usa una contraseña de al menos 6 caracteres">
          <Campo label="Contraseña actual" required>
            <PasswordInput value={pass.actual} onChange={e => setPass({ ...pass, actual: e.target.value })} />
          </Campo>
          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Campo label="Nueva contraseña" required>
              <PasswordInput value={pass.nuevo} onChange={e => setPass({ ...pass, nuevo: e.target.value })} />
            </Campo>
            <Campo label="Confirmar contraseña" required>
              <PasswordInput value={pass.confirmar} onChange={e => setPass({ ...pass, confirmar: e.target.value })} />
            </Campo>
          </div>
          {pass.nuevo && pass.confirmar && pass.nuevo !== pass.confirmar && (
            <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>Las contraseñas no coinciden</p>
          )}
          <Btn
            disabled={!passwordValida || passwordM.isPending} loading={passwordM.isPending}
            icon={<KeyRound size={14} />} onClick={() => passwordM.mutate()}
            style={{ alignSelf: 'flex-end', background: '#1E3A8A' }}
          >
            Cambiar contraseña
          </Btn>
        </SeccionCard>
      </div>
    </div>
  );
}
