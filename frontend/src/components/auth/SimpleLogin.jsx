import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SimpleLogin = () => {
  const [email, setEmail] = useState('admin@garden.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      console.log('🚀 Enviando login:', { email, password: '***' });

      // 🔥 URL DINÁMICA (YA NO localhost)
      const API_URL = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password
        }),
      });

      console.log('📡 Status:', response.status);
      console.log('📋 Status Text:', response.statusText);

      if (response.status === 500) {
        const errorText = await response.text();
        console.error('🚨 Error 500 del servidor:', errorText);
        setMessage(`Error del servidor: ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log('📦 Respuesta:', data);

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));

        setMessage('✅ ¡Login exitoso! Redirigiendo...');

        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);

      } else {
        setMessage(`❌ Error: ${data.error || 'Credenciales inválidas'}`);
      }

    } catch (error) {
      console.error('💥 Error de conexión:', error);
      setMessage(`💥 Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleLogin}>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input
          type="email"
          className="auth-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@garden.com"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Contraseña</label>
        <input
          type="password"
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password123"
          required
        />
      </div>

      <button
        type="submit"
        className="auth-button"
        disabled={loading}
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
      
      {message && (
        <div className={`auth-message ${message.includes('exitoso') ? 'auth-message-success' : 'auth-message-error'}`}>
          {message}
        </div>
      )}
    </form>
  );
};

export default SimpleLogin;