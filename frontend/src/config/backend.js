const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
).replace(/\/+$/, "");
const BACKEND_API_URL = `${BACKEND_BASE_URL}/api`;

export { BACKEND_BASE_URL, BACKEND_API_URL };
