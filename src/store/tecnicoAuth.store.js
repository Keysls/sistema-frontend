import { create } from 'zustand';
import { tecnicoAuthApi } from '../services/tecnicoApi';

const cargarTecnicoInicial = () => {
  try {
    const stored = localStorage.getItem('tecnico');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('tecnico');
    localStorage.removeItem('tecnicoToken');
    return null;
  }
};

export const useTecnicoAuthStore = create((set) => ({
  tecnico: cargarTecnicoInicial(),
  token: localStorage.getItem('tecnicoToken') || null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await tecnicoAuthApi.login({ email, password });
      localStorage.setItem('tecnicoToken', data.token);
      localStorage.setItem('tecnico', JSON.stringify(data.tecnico));
      set({ token: data.token, tecnico: data.tecnico, loading: false });
      return { ok: true };
    } catch (err) {
      set({ loading: false });
      return { ok: false, error: err.response?.data?.error || 'Error al iniciar sesión' };
    }
  },

  logout: () => {
    localStorage.removeItem('tecnicoToken');
    localStorage.removeItem('tecnico');
    set({ token: null, tecnico: null });
  },
}));
