import api from './api.js';

export const inventarioService = {
  // Ingredientes
  obtenerIngredientes: async () => {
    const response = await api.get('/inventario/ingredientes');
    return response.data;
  },

  crearIngrediente: async (ingrediente) => {
    const response = await api.post('/inventario/ingredientes', ingrediente);
    return response.data;
  },

  actualizarIngrediente: async (id, ingrediente) => {
    const response = await api.put(`/inventario/ingredientes/${id}`, ingrediente);
    return response.data;
  },

  eliminarIngrediente: async (id) => {
    const response = await api.delete(`/inventario/ingredientes/${id}`);
    return response.data;
  },

  // Productos preparados
  obtenerProductosPreparados: async () => {
    const response = await api.get('/inventario/productos-preparados');
    return response.data;
  },

  crearProductoPreparado: async (producto) => {
    const response = await api.post('/inventario/productos-preparados', producto);
    return response.data;
  },

prepararProducto: async ({ productoId, cantidad }) => {
  try {
    console.log('📦 Enviando body a backend:', { productoId, cantidad });

    const response = await api.post(
      '/inventario/productos-preparados/preparar',
      { productoId, cantidad } // 👈 ya no hace falta JSON.stringify
    );

    console.log('✅ Respuesta del backend:', response.data);

    // ⚡ Dispara evento personalizado para actualizar vista automáticamente
    const event = new CustomEvent('inventarioActualizado');
    window.dispatchEvent(event);

    return response.data;
  } catch (error) {
    console.error('❌ Error en prepararProducto:', error.response?.data || error);
    throw error;
  }
},


  venderProductoPreparado: async (data) => {
    const response = await api.post('/inventario/productos-preparados/vender', data);
    return response.data;
  },

  venderPlatoDirecto: async (data) => {
    const response = await api.post('/inventario/platos-directos/vender', data);
    return response.data;
  },

  // Movimientos y alertas
  obtenerMovimientos: async () => {
    const response = await api.get('/inventario/movimientos');
    return response.data;
  },

  obtenerAlertasStock: async () => {
    const response = await api.get('/inventario/alertas-stock');
    return response.data;
  },
};
