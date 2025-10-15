import axios from 'axios';
console.log('✅ api.js cargado correctamente');

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Interceptor para incluir token en todas las peticiones
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  console.log('🟢 TOKEN ENVIADO DESDE FRONTEND:', token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export default api;
