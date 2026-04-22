import api from "./api.js";

const normalizarAjustes = (ajustes) => {
  if (!Array.isArray(ajustes)) return [];
  return ajustes
    .map((a) => {
      const cantidadBase = Number(a?.cantidad_base);
      const cantidadReducida = Number(
        a?.cantidad_reducida ?? a?.reducir ?? a?.cantidad ?? 0,
      );
      const cantidadActualRaw = Number(a?.cantidad_actual);
      const cantidadActual = Number.isFinite(cantidadActualRaw)
        ? cantidadActualRaw
        : Number.isFinite(cantidadBase) && Number.isFinite(cantidadReducida)
          ? cantidadBase - cantidadReducida
          : undefined;

      return {
        ingrediente_id: Number(a?.ingrediente_id ?? a?.id ?? a?.ingredienteId),
        ingrediente_nombre: a?.ingrediente_nombre ?? a?.nombre ?? "",
        ingrediente_unidad: a?.ingrediente_unidad ?? a?.unidad ?? "",
        cantidad_base: Number.isFinite(cantidadBase) ? cantidadBase : undefined,
        cantidad_actual: Number.isFinite(cantidadActual)
          ? cantidadActual
          : undefined,
        cantidad_reducida: cantidadReducida,
      };
    })
    .filter(
      (a) =>
        Number.isFinite(a.ingrediente_id) &&
        a.ingrediente_id > 0 &&
        Number.isFinite(a.cantidad_reducida) &&
        a.cantidad_reducida > 0,
    );
};

export const pedidoService = {
  // =========================
  // OBTENER
  // =========================
  obtenerTodos: async (fecha) => {
    try {
      const { data } = await api.get("/pedidos", {
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
        throw new Error("Debe seleccionar una mesa");
      }

      if (!Array.isArray(pedido.detalles) || pedido.detalles.length === 0) {
        throw new Error("El pedido debe tener al menos un item");
      }

      const detalles = pedido.detalles.map((i) => ({
        producto_id: i.producto_id || null,
        cantidad: Number(i.cantidad),
        notas: i.notas ?? "",
        precio: Number(i.precio),
        ingredientes_ajustes: normalizarAjustes(i.ingredientes_ajustes),
      }));

      const { data } = await api.post("/pedidos", {
        mesa_id: Number(pedido.mesa_id),
        usuario_id: pedido.usuario_id || null,
        detalles,
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
        throw new Error("El pedido debe tener items");
      }

      const detalles = pedido.detalles.map((i) => ({
        producto_id: i.producto_id || null,
        cantidad: Number(i.cantidad),
        notas: i.notas ?? "",
        precio: Number(i.precio),
        ingredientes_ajustes: normalizarAjustes(i.ingredientes_ajustes),
      }));

      const { data } = await api.put(`/pedidos/${Number(id)}`, {
        mesa_id: Number(pedido.mesa_id),
        usuario_id: pedido.usuario_id || null,
        detalles,
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
      const { data } = await api.put(`/pedidos/${Number(id)}/estado`, {
        estado,
      });
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
        detalles: (Array.isArray(detalles) ? detalles : []).map((i) => ({
          ...i,
          ingredientes_ajustes: normalizarAjustes(i.ingredientes_ajustes),
        })),
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
  },
};
