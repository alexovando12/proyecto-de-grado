import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MesasPage from './pages/MesasPage.jsx';
import ProductosPage from './pages/ProductosPage.jsx';
import PedidosPage from './pages/PedidosPage.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/mesas" element={
              <ProtectedRoute>
                <MesasPage />
              </ProtectedRoute>
            } />
            <Route path="/productos" element={
              <ProtectedRoute>
                <ProductosPage />
              </ProtectedRoute>
            } />
            <Route path="/pedidos" element={
              <ProtectedRoute>
                <PedidosPage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;