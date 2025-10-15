import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { pedidoService } from '../../services/pedidoService.js';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

const CocinaView = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Unir a la sala de cocina
    socket.emit('join-room', 'cocina');
    
    // Cargar pedidos iniciales
    cargarPedidos();

    // Escuchar nuevos pedidos
    socket.on('nuevo-pedido-cocina', (pedido) => {
      setPedidos(prev => [...prev, pedido]);
    });

    // Escuchar actualizaciones de estado
    socket.on('pedido-actualizado', (pedido) => {
      setPedidos(prev => prev.map(p => p.id === pedido.id ? pedido : p));
    });

    return () => {
      socket.off('nuevo-pedido-cocina');
      socket.off('pedido-actualizado');
    };
  }, []);

  const cargarPedidos = async () => {
    try {
      const data = await pedidoService.obtenerParaCocina();
      setPedidos(data);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const iniciarPreparacion = async (pedidoId) => {
    try {
      await pedidoService.iniciarPreparacion(pedidoId);
      // El estado se actualiza automáticamente a través del socket
    } catch (error) {
      console.error('Error al iniciar preparación:', error);
    }
  };

  const marcarListo = async (pedidoId) => {
    try {
      await pedidoService.marcarListo(pedidoId);
      // El estado se actualiza automáticamente a través del socket
    } catch (error) {
      console.error('Error al marcar como listo:', error);
    }
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'confirmado': return 'estado-confirmado';
      case 'preparando': return 'estado-preparando';
      case 'listo': return 'estado-listo';
      default: return 'estado-pendiente';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'confirmado': return 'Confirmado';
      case 'preparando': return 'Preparando';
      case 'listo': return 'Listo para entregar';
      default: return 'Pendiente';
    }
  };

  if (loading) return <div className="loading">Cargando pedidos...</div>;

  return (
    <div className="cocina-view">
      <div className="cocina-header">
        <h1>Vista de Cocina</h1>
        <p>Bienvenido, {user?.nombre}</p>
      </div>

      <div className="cocina-content">
        <h2>Pedidos en Preparación</h2>
        
        {pedidos.length === 0 ? (
          <div className="no-pedidos">
            <p>No hay pedidos en preparación</p>
          </div>
        ) : (
          <div className="pedidos-grid">
            {pedidos.map(pedido => (
              <div key={pedido.id} className="pedido-card">
                <div className="pedido-header">
                  <div className="pedido-info">
                    <h3>Mesa {pedido.mesa_numero}</h3>
                    <p>Mozo: {pedido.mozo_nombre}</p>
                    <small>Hora: {new Date(pedido.fecha_creacion).toLocaleTimeString()}</small>
                  </div>
                  <div className={`pedido-estado ${getEstadoClass(pedido.estado)}`}>
                    {getEstadoTexto(pedido.estado)}
                  </div>
                </div>

                <div className="pedido-detalles">
                  <h4>Detalles del pedido:</h4>
                  <div className="detalles-list">
                    {pedido.detalles && pedido.detalles.map((detalle, index) => (
                      <div key={index} className="detalle-item">
                        <span>{detalle.cantidad}x {detalle.producto_nombre}</span>
                        {detalle.notas && (
                          <small className="notas">({detalle.notas})</small>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pedido-acciones">
                  {pedido.estado === 'confirmado' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => iniciarPreparacion(pedido.id)}
                    >
                      Iniciar Preparación
                    </button>
                  )}
                  
                  {pedido.estado === 'preparando' && (
                    <button
                      className="btn btn-success"
                      onClick={() => marcarListo(pedido.id)}
                    >
                      Marcar como Listo
                    </button>
                  )}
                  
                  {pedido.estado === 'listo' && (
                    <div className="estado-completado">
                      <span>✓ Listo para recoger</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CocinaView;