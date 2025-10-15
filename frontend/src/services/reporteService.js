import api from './api.js';

export const reporteService = {
  generarReporteVentas: async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const response = await api.get(`/reportes/ventas${params ? `?${params}` : ''}`);
    return response.data;
  },

  generarReporteProductosPopulares: async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const response = await api.get(`/reportes/productos-populares${params ? `?${params}` : ''}`);
    return response.data;
  },

  generarReporteInventario: async () => {
    const response = await api.get('/reportes/inventario');
    return response.data;
  },

  generarReporteMovimientos: async (filtros = {}) => {
    const params = new URLSearchParams(filtros).toString();
    const response = await api.get(`/reportes/movimientos${params ? `?${params}` : ''}`);
    return response.data;
  }
};