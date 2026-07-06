import { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos de usuario y token desde localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // 🔹 Login
  const login = async (credentials) => {
    try {
      console.log('AuthContext: Iniciando login con:', credentials);
      const data = await authService.login(credentials);
      console.log('AuthContext: Login exitoso, datos:', data);
      
      if (data && data.token && data.usuario) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        setUser(data.usuario);
        return data;
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error) {
      console.error('AuthContext: Error en login:', error);
      throw error;
    }
  };

  // 🔹 Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // 🔹 Verificar rol
  const hasRole = (roles) => {
    if (!user || !user.rol) return false;
    return roles.includes(user.rol);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    hasRole // 👉 Ahora se expone al dashboard
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  
  return context;
};
