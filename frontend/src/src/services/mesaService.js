// src/services/mesaService.js
import api from './api';

export const HAS_MESAS_ESTADO_ENDPOINT = false; 
export const HAS_MESAS_BY_ID_ENDPOINT = false; 

const normalizeMesa = (m) => ({
  ...m,
  estado: m?.estado ?? 'disponible',
});

export const mesaService = {

  obtenerTodas: async () => {
    try {
      const { data } = await api.get('/mesas');
      return Array.isArray(data) ? data.map(normalizeMesa) : [];
    } catch {
      return [];
    }
  },

  obtenerDisponibles: async () => {
    const todas = await mesaService.obtenerTodas();
    return (todas || []).filter((m) => (m?.estado ?? 'disponible') === 'disponible');
  },

  obtenerPorId: async (id) => {
    if (HAS_MESAS_BY_ID_ENDPOINT) {
      try {
        const { data } = await api.get(`/mesas/${Number(id)}`);
        return normalizeMesa(data);
      } catch {
        return null;
      }
    } else {
      const todas = await mesaService.obtenerTodas();
      return (todas || []).find((m) => Number(m.id) === Number(id)) || null;
    }
  },

  crear: async (mesa) => {
    const { data } = await api.post('/mesas', mesa, {
      headers: { 'Content-Type': 'application/json' },
    });
    return normalizeMesa(data);
  },

  actualizar: async (id, mesa) => {
    const { data } = await api.put(`/mesas/${Number(id)}`, mesa, {
      headers: { 'Content-Type': 'application/json' },
    });
    return normalizeMesa(data);
  },

  eliminar: async (id) => {
    const { data } = await api.delete(`/mesas/${Number(id)}`);
    return data;
  },

  actualizarEstado: async (id, estado) => {
    if (!HAS_MESAS_ESTADO_ENDPOINT) {
      return { ok: false, skipped: true };
    }
    const idNum = Number(id);
    try {
      const { data } = await api.put(
        `/mesas/${idNum}/estado`,
        { estado },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return { ok: true, data: normalizeMesa(data) };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || err.message;
      throw new Error(`Error actualizando estado de mesa: ${msg}`);
    }
  },
};
