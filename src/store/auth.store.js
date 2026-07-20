import { create } from 'zustand';
import { authApi } from '../services/api';
import { queryClient } from '../queryClient';

const cargarUsuarioInicial = () => {
  try {
    const stored = localStorage.getItem('usuario');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    return null;
  }
};

export const useAuthStore = create((set) => ({
  usuario: cargarUsuarioInicial(),
  token: localStorage.getItem('token') || null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      set({ token: data.token, usuario: data.usuario, loading: false });
      return { ok: true };
    } catch (err) {
      set({ loading: false });
      return { ok: false, error: err.response?.data?.error || 'Error al iniciar sesión' };
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    set({ token: null, usuario: null });
    queryClient.clear();
  },
}));
