import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import Layout from './layout/Layout';

const RUTAS_PERMITIDAS_SECRETARIA = ['/', '/contratos', '/pagos', '/perfil'];

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (usuario?.rol === 'SECRETARIA') {
    const permitido = RUTAS_PERMITIDAS_SECRETARIA.some(
      (base) => location.pathname === base || location.pathname.startsWith(base + '/')
    );
    if (!permitido) {
      return <Navigate to="/" replace />;
    }
  }

  return <Layout>{children}</Layout>;
}
