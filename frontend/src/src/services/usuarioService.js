import api from "./api.js";

export const usuarioService = {
  obtenerTodos: async () => {
    const response = await api.get("/usuarios");
    return response.data;
  },

  obtenerPorId: async (id) => {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },

  crear: async (usuario) => {
    const response = await api.post("/usuarios", usuario);
    return response.data;
  },

  actualizar: async (id, usuario) => {
    const response = await api.put(`/usuarios/${id}`, usuario);
    return response.data;
  },

  eliminar: async (id) => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  },
};
