import axios from 'axios';
import { BACKEND_URL } from './api';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tecnicoToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/tecnico/login')) {
      localStorage.removeItem('tecnicoToken');
      localStorage.removeItem('tecnico');
      window.location.href = '/tecnico/login';
    }
    return Promise.reject(err);
  }
);

export const tecnicoAuthApi = {
  login: (payload) => api.post('/auth/tecnico/login', payload),
  me: () => api.get('/auth/tecnico/me'),
};

export const tecnicoOrdenesApi = {
  listar:     () => api.get('/tecnico/ordenes'),
  historial:  () => api.get('/tecnico/ordenes/historial'),
  obtener:    (id) => api.get(`/tecnico/ordenes/${id}`),
  tomar:      (id) => api.post(`/tecnico/ordenes/${id}/tomar`),
  aceptar:    (id) => api.patch(`/tecnico/ordenes/${id}/aceptar`),
  iniciar:    (id) => api.patch(`/tecnico/ordenes/${id}/iniciar`),
  completar:  (id, payload) => api.patch(`/tecnico/ordenes/${id}/completar`, payload),
};

export const tecnicoPuntosRedApi = {
  listar: () => api.get('/puntos-red'),
};

export const tecnicoInventarioApi = {
  productos: (params) => api.get('/inventario/productos', { params }),
};

export default api;
