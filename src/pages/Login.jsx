import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  const [form,     setForm]     = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(form.email, form.password);
    if (res.ok) navigate('/');
    else        setError(res.error);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #C8DAEA', background: '#F4F8FC',
    fontSize: 13, color: '#0D1B2A', outline: 'none',
    transition: 'border-color .15s', boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F4F8FC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, marginBottom: 14,
            background: '#fff', border: '1px solid #C8DAEA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(30,58,138,0.1)',
          }}>
            <img src="/logo.png" alt="Logo"
              style={{ width: 40, height: 40, objectFit: 'contain' }}
              onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML='<span style="font-size:24px;font-weight:900;color:#1E3A8A">SG</span>'; }}/>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D1B2A', margin: 0 }}>Sistema de Gestión</h1>
          <p style={{ fontSize: 12, color: '#5A7A9A', marginTop: 4 }}>Panel Administrador</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: 20,
          border: '1px solid #E2ECF4', padding: 28,
          boxShadow: '0 8px 32px rgba(30,58,138,0.08)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0D1B2A', margin: '0 0 4px' }}>Iniciar sesión</h2>
          <p style={{ fontSize: 12, color: '#8AAABB', margin: '0 0 24px' }}>Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Correo electrónico
              </label>
              <input type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@sistema.com" autoComplete="email" required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#1E3A8A'}
                onBlur={e  => e.target.style.borderColor = '#C8DAEA'} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A6A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" autoComplete="current-password" required
                  style={{ ...inputStyle, padding: '10px 40px 10px 14px' }}
                  onFocus={e => e.target.style.borderColor = '#1E3A8A'}
                  onBlur={e  => e.target.style.borderColor = '#C8DAEA'} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8AAABB', padding: 0 }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && <ErrorBox message={error} />}

            <BtnSubmit loading={loading} label="Ingresar" />
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#8AAABB', marginTop: 20 }}>
          Sistema de Gestión
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div style={{ fontSize: 12, color: '#DC2626', padding: '10px 14px', background: 'rgba(220,38,38,0.07)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)', borderLeft: '3px solid #DC2626' }}>
      {message}
    </div>
  );
}

function BtnSubmit({ loading, label }) {
  return (
    <button type="submit" disabled={loading}
      style={{
        width: '100%', padding: '12px', borderRadius: 10,
        background: loading ? '#93AECB' : '#1E3A8A',
        color: '#fff', fontSize: 14, fontWeight: 700,
        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background .15s',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#162d6e'; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1E3A8A'; }}>
      {loading
        ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> Verificando…</>
        : label}
    </button>
  );
}
