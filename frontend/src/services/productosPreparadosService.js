import api from './api.js';

export const productosPreparadosService = {
  obtenerProductosPreparados: async () => {
    const response = await api.get('/inventario/productos-preparados');
    return response.data;
  },

  crearProductoPreparado: async (producto) => {
    const response = await api.post('/inventario/productos-preparados', producto);
    return response.data;
  },

  actualizarProductoPreparado: async (id, producto) => {
    const response = await api.put(`/inventario/productos-preparados/${id}`, producto);
    return response.data;
  },

  eliminarProductoPreparado: async (id) => {
    const response = await api.delete(`/inventario/productos-preparados/${id}`);
    return response.data;
  },

obtenerReceta: async (productoId) => {
  try {
    const response = await api.get(`/inventario/productos-preparados/${productoId}/receta`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener receta:', error);
    throw error;
  }
},

  agregarIngredienteAReceta: async (productoId, ingredienteId, cantidad) => {
    const response = await api.post(`/inventario/productos-preparados/${productoId}/receta`, {
      ingrediente_id: ingredienteId,
      cantidad,
    });
    return response.data;
  },

  eliminarRecetaPorProducto: async (productoId) => {
    const response = await api.delete(`/inventario/productos-preparados/${productoId}/receta`);
    return response.data;
  },
};
