import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { pedidoService } from '../services/pedidoService.js';
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // 🔌 conexión socket

const CocinaPage = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('preparando'); // 👈 Directo a "preparando"

  useEffect(() => {
    cargarPedidos();

    socket.on("pedidoCreado", (pedido) => {
      if (pedido.estado === filtroEstado || filtroEstado === '') {
        setPedidos(prev => [pedido, ...prev]);
      }
    });

    socket.on("pedidoActualizado", (pedido) => {
      setPedidos(prev => {
        const existe = prev.some(p => p.id === pedido.id);
        if (pedido.estado === filtroEstado || filtroEstado === '') {
          if (existe) {
            return prev.map(p => p.id === pedido.id ? pedido : p);
          } else {
            return [pedido, ...prev];
          }
        } else {
          return prev.filter(p => p.id !== pedido.id);
        }
      });
    });

    socket.on("pedidoEliminado", ({ id }) => {
      setPedidos(prev => prev.filter(p => p.id !== id));
    });

    return () => {
      socket.off("pedidoCreado");
      socket.off("pedidoActualizado");
      socket.off("pedidoEliminado");
    };
  }, [filtroEstado]);

  const cargarPedidos = async () => {
    try {
      const data = await pedidoService.obtenerPorEstado(filtroEstado);
      setPedidos(data);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (id, nuevoEstado) => {
    try {
      await pedidoService.actualizarEstado(id, nuevoEstado);
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'preparando': return 'badge-primary';
      case 'listo': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="cocina-container">
      <header className="cocina-header">
        <div className="container">
          <div className="header-content">
            <div className="header-logo">
              <h1 className="header-title">Cocina</h1>
              <p className="header-subtitle">Garden Gates</p>
            </div>
            <div className="header-user">
              <span>Bienvenido, {user?.nombre}</span>
              <button className="btn btn-secondary" onClick={() => window.location.href = '/dashboard'}>
                Volver
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="cocina-content">
        <div className="container">
          <div className="cocina-controls">
            <h2 className="cocina-title">Pedidos en Cocina</h2>
            <div className="cocina-filtros">
              <select 
                value={filtroEstado} 
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="form-select"
              >
                <option value="preparando">En Preparación</option>
                <option value="listo">Listos para Entregar</option>
              </select>
            </div>
          </div>

          <div className="pedidos-grid">
            {pedidos.map(pedido => (
              <div key={pedido.id} className="pedido-card">
                <div className="pedido-header">
                  <div>
                    <h3 className="pedido-mesa">Pedido #{pedido.id}</h3>
                    <p className="pedido-mozo">
                      Mesa {pedido.mesa_numero ?? '—'}
                    </p>
                  </div>
                  <span className={`badge ${getEstadoColor(pedido.estado)}`}>
                    {pedido.estado}
                  </span>
                </div>

                <div className="pedido-items">
                  <h4>Items:</h4>
                  {(pedido.detalles ?? []).map((d, idx) => (
                    <div key={idx} className="pedido-detalle">
                      <span>{d.producto_nombre ?? '—'}</span>
                      <span>x{d.cantidad}</span>
                      <span>{d.precio} Bs</span>
                      {d.notas && <span>Nota: {d.notas}</span>}
                    </div>
                  ))}
                  <p className="pedido-total">Total: {pedido.total} Bs</p>
                </div>

                <div className="pedido-actions">
                  {pedido.estado === 'preparando' && (
                    <button 
                      className="btn btn-success"
                      onClick={() => actualizarEstado(pedido.id, 'listo')}
                    >
                      Marcar como Listo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pedidos.length === 0 && (
            <div className="cocina-vacio">
              <p>No hay pedidos en este estado</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CocinaPage;
