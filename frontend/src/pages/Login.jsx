import React, { useState } from "react";
import { BACKEND_API_URL } from "../config/backend.js";

const Login = () => {
  const [email, setEmail] = useState("admin@garden.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      console.log("🚀 Enviando login:", { email, password: "***" });

      const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      console.log("📡 Status:", response.status);
      console.log("📋 Status Text:", response.statusText);

      if (response.status === 500) {
        const errorText = await response.text();
        console.error("🚨 Error 500 del servidor:", errorText);
        setMessage(`Error del servidor: ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log("📦 Respuesta:", data);

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.usuario));

        setMessage("✅ ¡Login exitoso! Redirigiendo...");

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        setMessage(`❌ Error: ${data.error || "Credenciales inválidas"}`);
      }
    } catch (error) {
      console.error("💥 Error de conexión:", error);
      setMessage(`💥 Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Garden Gates</h1>
        <p className="login-subtitle">Sistema de Restaurante</p>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-form-group">
            <label className="login-label">Email</label>
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-form-group">
            <label className="login-label">Contraseña</label>
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        {message && (
          <div
            className={`login-message ${message.includes("exitoso") ? "login-message-success" : "login-message-error"}`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
