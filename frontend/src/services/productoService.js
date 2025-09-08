import api from './api.js';

export const productoService = {
  obtenerTodos: async () => {
    const response = await api.get('/productos');
    return response.data;
  },

  obtenerPorId: async (id) => {
    const response = await api.get(`/productos/${id}`);
    return response.data;
  },

  crear: async (producto) => {
    const response = await api.post('/productos', producto);
    return response.data;
  },

  actualizar: async (id, producto) => {
    const response = await api.put(`/productos/${id}`, producto);
    return response.data;
  },

  eliminar: async (id) => {
    const response = await api.delete(`/productos/${id}`);
    return response.data;
  },

  obtenerPorCategoria: async (categoria) => {
    const response = await api.get(`/productos/categoria/${categoria}`);
    return response.data;
  },

  buscar: async (termino) => {
    const response = await api.get(`/productos/buscar?termino=${encodeURIComponent(termino)}`);
    return response.data;
  }
};