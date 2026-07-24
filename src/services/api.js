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
  login:            (payload) => api.post('/auth/login', payload),
  logout:           () => api.post('/auth/logout'),
  me:               () => api.get('/auth/me'),
  actualizarPerfil: (payload) => api.put('/auth/me', payload),
  cambiarPassword:  (payload) => api.put('/auth/me/password', payload),
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

export const tecnicosApi = {
  listar:     (params) => api.get('/tecnicos', { params }),
  crear:      (payload) => api.post('/tecnicos', payload),
  actualizar: (id, payload) => api.put(`/tecnicos/${id}`, payload),
  eliminar:   (id) => api.delete(`/tecnicos/${id}`),
};

export const secretariosApi = {
  listar:     (params) => api.get('/secretarios', { params }),
  crear:      (payload) => api.post('/secretarios', payload),
  actualizar: (id, payload) => api.put(`/secretarios/${id}`, payload),
  eliminar:   (id) => api.delete(`/secretarios/${id}`),
};

export const inventarioApi = {
  stats:            () => api.get('/inventario/stats'),
  productos:        (params) => api.get('/inventario/productos', { params }),
  movimientos:      (params) => api.get('/inventario/movimientos', { params }),
  movimientosTodos: (params) => api.get('/inventario/movimientos/todos', { params }),
  entrada:          (payload) => api.post('/inventario/entradas', payload),
  salida:           (payload) => api.post('/inventario/salidas', payload),
};

export const clientesApi = {
  listar:     (params) => api.get('/clientes', { params }),
  crear:      (payload) => api.post('/clientes', payload),
  actualizar: (id, payload) => api.put(`/clientes/${id}`, payload),
};

export const reniecApi = {
  dni: (numero) => api.get(`/reniec/dni/${numero}`),
  ruc: (numero) => api.get(`/reniec/ruc/${numero}`),
};

export const puntosRedApi = {
  listar:     () => api.get('/puntos-red'),
  crear:      (payload) => api.post('/puntos-red', payload),
  actualizar: (id, payload) => api.put(`/puntos-red/${id}`, payload),
  eliminar:   (id) => api.delete(`/puntos-red/${id}`),
};

export const planesApi = {
  listar:     (params) => api.get('/planes', { params }),
  crear:      (payload) => api.post('/planes', payload),
  actualizar: (id, payload) => api.put(`/planes/${id}`, payload),
};

export const contratosApi = {
  listar:     (params) => api.get('/contratos', { params }),
  mapa:       () => api.get('/contratos/mapa'),
  obtener:    (id) => api.get(`/contratos/${id}`),
  crear:      (payload) => api.post('/contratos', payload),
  actualizar: (id, payload) => api.put(`/contratos/${id}`, payload),
  eliminar:   (id) => api.delete(`/contratos/${id}`),
  importar:   (filas) => api.post('/contratos/importar', { filas }),
  siguienteNumero: () => api.get('/contratos/siguiente-numero'),
};

export const ordenesApi = {
  listar:        (params) => api.get('/ordenes-servicio', { params }),
  obtener:       (id) => api.get(`/ordenes-servicio/${id}`),
  crear:         (payload) => api.post('/ordenes-servicio', payload),
  actualizar:    (id, payload) => api.put(`/ordenes-servicio/${id}`, payload),
  cambiarEstado: (id, payload) => api.patch(`/ordenes-servicio/${id}/estado`, payload),
  stats:         () => api.get('/ordenes-servicio/stats'),
};

export const cargosApi = {
  porContrato:      (contratoId) => api.get(`/cargos/contrato/${contratoId}`),
  preview:          () => api.get('/cargos/preview'),
  generar:          (payload) => api.post('/cargos/generar', payload),
  crearManual:      (payload) => api.post('/cargos', payload),
  aplicarDescuento: (cargoId, porcentaje) => api.patch(`/cargos/${cargoId}/descuento`, { porcentaje }),
  quitarDescuento:  (cargoId) => api.delete(`/cargos/${cargoId}/descuento`),
  descuentoMasivoPreview: (periodo) => api.get('/cargos/descuento-masivo/preview', { params: { periodo } }),
  descuentoMasivo:  (payload) => api.post('/cargos/descuento-masivo', payload),
  quitarDescuentoMasivo: (periodo) => api.post('/cargos/quitar-descuento-masivo', { periodo }),
  mesesSaltados:    (contratoId) => api.get(`/cargos/meses-saltados/${contratoId}`),
  generarSaltados:  (payload) => api.post('/cargos/generar-saltados', payload),
  descartarSaltados:(contratoId) => api.post(`/cargos/descartar-saltados/${contratoId}`),
};

export const pagosApi = {
  listar:      (params) => api.get('/pagos', { params }),
  crear:       (payload) => api.post('/pagos', payload),
  comprobante: (id) => api.get(`/pagos/${id}/comprobante`, { responseType: 'blob' }),
  reporte:     (params) => api.get('/pagos/reporte', { params }),
};

export const egresosApi = {
  listar:    (params) => api.get('/egresos', { params }),
  crear:     (payload) => api.post('/egresos', payload),
  eliminar:  (id) => api.delete(`/egresos/${id}`),
};

export const empresaApi = {
  obtener:            () => api.get('/empresa'),
  actualizar:         (payload) => api.put('/empresa', payload),
  agregarMetodo:      (payload) => api.post('/empresa/metodos', payload),
  actualizarMetodo:   (id, payload) => api.put(`/empresa/metodos/${id}`, payload),
  eliminarMetodo:     (id) => api.delete(`/empresa/metodos/${id}`),
};

export default api;