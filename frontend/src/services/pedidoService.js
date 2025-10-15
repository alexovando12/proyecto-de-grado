import api from './api.js';

// Estados permitidos
const ALLOWED_STATES = ['pendiente', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado'];

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

  actualizarEstado: async (id, estado) => {
    const idNum = Number(id);
    const e = sanitizeEstado(estado);

    const { data } = await api.put(
      `/pedidos/${idNum}/estado`,
      { estado: e },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return data;
  },
};
