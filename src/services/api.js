import axios from 'axios';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const productosApi = {
  catalogo:          (params) => api.get('/productos/catalogo', { params }),
  categorias:        () => api.get('/productos/categorias'),
  crear:             (payload) => api.post('/productos', payload),
  actualizar:        (id, payload) => api.put(`/productos/${id}`, payload),
  variantes:         (productoId) => api.get(`/productos/${productoId}/variantes`),
  crearVariante:     (productoId, payload) => api.post(`/productos/${productoId}/variantes`, payload),
  actualizarVariante:(varianteId, payload) => api.put(`/productos/variantes/${varianteId}`, payload),
  eliminarVariante:  (varianteId) => api.delete(`/productos/variantes/${varianteId}`),
};

export default api;
