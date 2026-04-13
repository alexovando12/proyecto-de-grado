import axios from "axios";
import { BACKEND_API_URL } from "../config/backend.js";

console.log("✅ api.js cargado correctamente");

console.log("🌍 API URL:", BACKEND_API_URL);

const api = axios.create({
  baseURL: BACKEND_API_URL,
});

// 🔐 Interceptor para enviar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  console.log("🟢 TOKEN ENVIADO DESDE FRONTEND:", token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
