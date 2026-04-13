import api from './api.js';

export const pedidoService = {

  // =========================
  // OBTENER
  // =========================
  obtenerTodos: async (fecha) => {
    try {
      const { data } = await api.get('/pedidos', {
        params: fecha ? { fecha } : undefined,
      });
      return data;
    } catch {
      return [];
    }
  },

  obtenerPorId: async (id) => {
    const { data } = await api.get(`/pedidos/${Number(id)}`);
    return data;
  },

  // =========================
  // CREAR PEDIDO 🔥
  // =========================
crear: async (pedido) => {
  try {
    if (!pedido.mesa_id) {
      throw new Error('Debe seleccionar una mesa');
    }

    if (!Array.isArray(pedido.detalles) || pedido.detalles.length === 0) {
      throw new Error('El pedido debe tener al menos un item');
    }

    const detalles = pedido.detalles.map(i => ({
      producto_id: i.producto_id || null,
      cantidad: Number(i.cantidad),
      notas: i.notas ?? '',
      precio: Number(i.precio)
    }));

    const { data } = await api.post('/pedidos', {
      mesa_id: Number(pedido.mesa_id),
      usuario_id: pedido.usuario_id || null,
      detalles
    });

    return data;

  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
},
  // =========================
  // EDITAR PEDIDO 🔥🔥🔥
  // =========================
actualizar: async (id, pedido) => {
  try {
    if (!Array.isArray(pedido.detalles) || pedido.detalles.length === 0) {
      throw new Error('El pedido debe tener items');
    }

    const detalles = pedido.detalles.map(i => ({
      producto_id: i.producto_id || null,
      cantidad: Number(i.cantidad),
      notas: i.notas ?? '',
      precio: Number(i.precio)
    }));

    const { data } = await api.put(`/pedidos/${Number(id)}`, {
      mesa_id: Number(pedido.mesa_id),
      usuario_id: pedido.usuario_id || null,
      detalles
    });

    return data;

  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
},

  // =========================
  // ELIMINAR PEDIDO 🔥🔥🔥
  // =========================
  eliminar: async (id) => {
    try {
      const { data } = await api.delete(`/pedidos/${Number(id)}`);
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message);
    }
  },

  // =========================
  // ESTADOS
  // =========================
  actualizarEstado: async (id, estado) => {
    try {
      const { data } = await api.put(`/pedidos/${Number(id)}/estado`, { estado });
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message);
    }
  },
  obtenerPorEstado: async (estado, fecha) => {
  try {
    const { data } = await api.get(`/pedidos/estado/${estado}`, {
      params: fecha ? { fecha } : undefined,
    });
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
},

editarDetalles: async (id, detalles) => {
  try {
    const { data } = await api.put(`/pedidos/${Number(id)}/detalles`, {
      detalles
    });
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
},
liberarMesa: async (id) => {
  try {
    const { data } = await api.put(`/pedidos/${Number(id)}/liberar`);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
},
obtenerPorMesa: async (mesaId) => {
  try {
    const { data } = await api.get(`/pedidos/mesa/${Number(mesaId)}`);
    return data;
  } catch (error) {
    console.warn("Error mesa", mesaId);
    return []; // 🔥 EVITA QUE REVIENTE TODO
  }
}
};