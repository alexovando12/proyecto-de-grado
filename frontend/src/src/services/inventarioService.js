import api from './api.js';

export const inventarioService = {


  obtenerIngredientes: async () => {
    try {
      const response = await api.get('/inventario/ingredientes');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al obtener ingredientes');
    }
  },

  crearIngrediente: async (ingrediente) => {
    try {
      const response = await api.post('/inventario/ingredientes', ingrediente);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al crear ingrediente');
    }
  },

  actualizarIngrediente: async (id, ingrediente) => {
    try {
      const response = await api.put(`/inventario/ingredientes/${id}`, ingrediente);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al actualizar ingrediente');
    }
  },

  eliminarIngrediente: async (id) => {
    try {
      const response = await api.delete(`/inventario/ingredientes/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al eliminar ingrediente');
    }
  },


  obtenerProductosPreparados: async () => {
    try {
      const response = await api.get('/inventario/productos-preparados');
      return response.data;
    } catch (error) {
      throw new Error('Error al obtener productos preparados');
    }
  },

  crearProductoPreparado: async (producto) => {
    try {
      const response = await api.post('/inventario/productos-preparados', producto);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al crear producto');
    }
  },

  prepararProducto: async ({ productoId, cantidad }) => {
    try {
      const response = await api.post(
        '/inventario/productos-preparados/preparar',
        { productoId, cantidad }
      );

      window.dispatchEvent(new Event('inventarioActualizado'));

      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al preparar producto');
    }
  },

  venderProductoPreparado: async (data) => {
    try {
      const response = await api.post('/inventario/productos-preparados/vender', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al vender producto');
    }
  },

  venderPlatoDirecto: async (data) => {
    try {
      const response = await api.post('/inventario/platos-directos/vender', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Error al vender plato');
    }
  },

  obtenerMovimientos: async () => {
    try {
      const response = await api.get('/inventario/movimientos');
      return response.data;
    } catch {
      return [];
    }
  },

  obtenerAlertasStock: async () => {
    try {
      const response = await api.get('/inventario/alertas-stock');
      return response.data;
    } catch {
      return { ingredientes: [], productosPreparados: [] };
    }
  },
};