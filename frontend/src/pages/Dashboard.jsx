import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="header-logo">
              <h1 className="header-title">Garden Gates</h1>
              <p className="header-subtitle">Sistema de Restaurante</p>
            </div>
            <div className="header-user">
              <span>Bienvenido, {user?.nombre}</span>
              <button className="btn btn-secondary" onClick={handleLogout}>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="container">
          <h2 className="dashboard-title">Panel Principal</h2>
          <p className="dashboard-subtitle">Selecciona una opción para comenzar</p>
          
          <div className="dashboard-grid">
            <div className="dashboard-card dashboard-card-mesas" onClick={() => window.location.href = '/mesas'}>
              <div className="dashboard-card-icon">🪑</div>
              <h3 className="dashboard-card-title">Mesas</h3>
              <p className="dashboard-card-description">Gestionar mesas</p>
            </div>
            <div className="dashboard-card dashboard-card-pedidos" onClick={() => window.location.href = '/productos'}>
            <div className="dashboard-card-icon">🍽️</div>
            <h3 className="dashboard-card-title">Productos</h3>
            <p className="dashboard-card-description">Catálogo de productos</p>
          </div>
            <div className="dashboard-card dashboard-card-pedidos" onClick={() => window.location.href = '/pedidos'}>
              <div className="dashboard-card-icon">📝</div>
              <h3 className="dashboard-card-title">Pedidos</h3>
              <p className="dashboard-card-description">Tomar pedidos</p>
            </div>
            
            <div className="dashboard-card dashboard-card-cocina" onClick={() => window.location.href = '/cocina'}>
              <div className="dashboard-card-icon">👨‍🍳</div>
              <h3 className="dashboard-card-title">Cocina</h3>
              <p className="dashboard-card-description">Vista de cocina</p>
            </div>
            
            <div className="dashboard-card dashboard-card-inventario" onClick={() => window.location.href = '/inventario'}>
              <div className="dashboard-card-icon">📦</div>
              <h3 className="dashboard-card-title">Inventario</h3>
              <p className="dashboard-card-description">Control de stock</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;