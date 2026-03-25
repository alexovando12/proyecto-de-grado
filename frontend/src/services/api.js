import axios from 'axios';

console.log('✅ api.js cargado correctamente');

// 🔥 Verificar que la URL está bien en producción
console.log("🌍 API URL:", import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // ❗ SOLO esto, sin localhost
});

// 🔐 Interceptor para enviar token automáticamente
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');

  console.log('🟢 TOKEN ENVIADO DESDE FRONTEND:', token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;