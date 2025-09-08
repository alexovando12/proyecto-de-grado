// src/services/pedidoService.js
import api from './api.js';

// Estados permitidos por el UI (ajusta si tu backend difiere)
const ALLOWED_STATES = ['pendiente', 'confirmado', 'preparando', 'listo', 'entregado']; 
// Si tu backend NO soporta 'cancelado', déjalo fuera. Si lo soporta, agrégalo aquí.

const sanitizeEstado = (estado) => {
  const e = String(estado || '').trim().toLowerCase();
  if (!ALLOWED_STATES.includes(e)) {
    throw new Error(`Estado no permitido: "${estado}". Permitidos: ${ALLOWED_STATES.join(', ')}`);
  }
  return e;
};

export const pedidoService = {
  obtenerTodos: async () => {
    const { data } = await api.get('/pedidos');
    return data;
  },

  obtenerPorId: async (id) => {
    const { data } = await api.get(`/pedidos/${Number(id)}`);
    return data;
  },

  crear: async (pedido) => {
    const { data } = await api.post('/pedidos', pedido, {
      headers: { 'Content-Type': 'application/json' },
    });
    return data;
  },

  actualizar: async (id, pedido) => {
    const { data } = await api.put(`/pedidos/${Number(id)}`, pedido, {
      headers: { 'Content-Type': 'application/json' },
    });
    return data;
  },

  eliminar: async (id) => {
    const { data } = await api.delete(`/pedidos/${Number(id)}`);
    return data;
  },

  obtenerPorMesa: async (mesa_id) => {
    const { data } = await api.get(`/pedidos/mesa/${Number(mesa_id)}`);
    return data;
  },

  obtenerPorEstado: async (estado) => {
    const { data } = await api.get(`/pedidos/estado/${sanitizeEstado(estado)}`);
    return data;
  },

  // Intenta PUT /pedidos/:id/estado; si tu backend no tiene ese endpoint,
  // hace fallback a PATCH /pedidos/:id con { estado }.
  actualizarEstado: async (id, estado) => {
    const idNum = Number(id);
    const e = sanitizeEstado(estado);

    try {
      const { data } = await api.put(
        `/pedidos/${idNum}/estado`,
        { estado: e },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return data;
    } catch (err) {
      const status = err?.response?.status;
      // Si la ruta no existe o no acepta PUT, intenta PATCH genérico
      if (status === 404 || status === 405 || status === 501) {
        const { data } = await api.patch(
          `/pedidos/${idNum}`,
          { estado: e },
          { headers: { 'Content-Type': 'application/json' } }
        );
        return data;
      }

      // Propaga el error original con mensaje útil del backend
      const msg = err?.response?.data?.message || err?.response?.data || err.message;
      throw new Error(`Backend respondió ${status || ''}: ${msg}`);
    }
  },
};
