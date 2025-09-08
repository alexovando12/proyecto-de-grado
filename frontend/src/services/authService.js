import api from './api';

export const authService = {
  login: async (credentials) => {
    try {
      console.log('Enviando petición de login:', credentials);
      const response = await api.post('/auth/login', credentials);
      console.log('Respuesta del servidor:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error en authService.login:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      throw error;
    }
  },
  
  registro: async (userData) => {
    const response = await api.post('/auth/registro', userData);
    return response.data;
  }
};