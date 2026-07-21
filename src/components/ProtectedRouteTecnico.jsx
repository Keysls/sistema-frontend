import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTecnicoAuthStore } from '../store/tecnicoAuth.store';
import LayoutTecnico from './layout/LayoutTecnico';

export default function ProtectedRouteTecnico({ children }) {
  const token = useTecnicoAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/tecnico/login" replace />;
  }

  return <LayoutTecnico>{children}</LayoutTecnico>;
}
