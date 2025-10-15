import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext.jsx";
import { pedidoService } from "../services/pedidoService.js";
import PedidoForm from "../components/pedidos/PedidoForm.jsx";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const toNum = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const toMoney = (v) =>
  new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
  }).format(toNum(v));

const normalizePedido = (p) => {
  const detalles = Array.isArray(p?.detalles)
    ? p.detalles.map(d => ({
        ...d,
        precio: toNum(d?.precio),
        cantidad: toNum(d?.cantidad),
      }))
    : [];

  const totalCalc = detalles.reduce((acc, d) => acc + d.precio * d.cantidad, 0);
  const total = toNum(p?.total) || totalCalc;

  return {
    ...p,
    estado: p?.estado ?? 'preparando',
    detalles,
    total,
  };
};

const PedidosPage = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');

  // 🔥 Modal para edición
  const [showEditForm, setShowEditForm] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState(null);

  useEffect(() => {
    cargarPedidos();

    socket.on("pedidoCreado", (pedido) => {
      setPedidos(prev => [normalizePedido(pedido), ...prev]);
    });

    socket.on("pedidoActualizado", (pedido) => {
      setPedidos(prev => prev.map(p => p.id === pedido.id ? normalizePedido(pedido) : p));
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
      setLoading(true);
      const data = await pedidoService.obtenerTodos();
      setPedidos((Array.isArray(data) ? data : []).map(normalizePedido));
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePedidoCreado = () => {
    setShowForm(false);
    setSelectedMesa(null);
    setFiltroEstado('');
    cargarPedidos();
  };

  const actualizarEstadoPedido = async (id, estado) => {
    try {
      await pedidoService.actualizarEstado(Number(id), estado);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.response?.data || error.message;
      console.error('Error al actualizar estado:', msg);
      alert(`No se pudo actualizar el estado: ${msg}`);
    }
  };

  const editarPedido = (pedido) => {
    setPedidoEditando(pedido);
    setShowEditForm(true);
  };

  const liberarMesa = async (id) => {
    try {
      await pedidoService.liberarMesa(id);
      setPedidos(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error al liberar mesa:', error);
    }
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'preparando':  return 'badge-primary';
      case 'listo':       return 'badge-success';
      case 'entregado':   return 'badge-secondary';
      case 'cerrado':     return 'badge-dark';
      default:            return 'badge-secondary';
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'preparando':  return 'Preparando';
      case 'listo':       return 'Listo';
      case 'entregado':   return 'Entregado';
      case 'cerrado':     return 'Cerrado';
      default:            return estado || '—';
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="pedidos-container">
      <header className="pedidos-header">
        <div className="pedidos-header-content">
          <h1 className="pedidos-title">Toma de Pedidos</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Nuevo Pedido
          </button>
        </div>
      </header>

      <main className="pedidos-content">
        <div className="container">
          {/* Formulario para NUEVO pedido */}
          {showForm && (
            <PedidoForm
              onPedidoCreado={handlePedidoCreado}
              mesaSeleccionada={selectedMesa}
            />
          )}

          {/* Modal para EDITAR pedido */}
          {showEditForm && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Editar Pedido #{pedidoEditando?.id}</h2>
                <PedidoForm
                  pedidoExistente={pedidoEditando}
                  onPedidoCreado={() => {
                    setShowEditForm(false);
                    setPedidoEditando(null);
                    cargarPedidos();
                  }}
                />
                <button className="btn btn-secondary mt-2" onClick={() => setShowEditForm(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          )}

          <div className="pedidos-filters">
            <div className="pedidos-filters-group">
              <label className="form-label">Filtrar por estado:</label>
              <select
                className="form-control"
                value={filtroEstado}
                onChange={async (e) => {
                  const estado = e.target.value;
                  setFiltroEstado(estado);
                  if (!estado) cargarPedidos();
                  else {
                    const data = await pedidoService.obtenerPorEstado(estado);
                    setPedidos((Array.isArray(data) ? data : []).map(normalizePedido));
                  }
                }}
              >
                <option value="">Todos</option>
                <option value="preparando">Preparando</option>
                <option value="listo">Listo</option>
                <option value="entregado">Entregado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          </div>

          <div className="pedidos-grid">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="pedido-card">
                <div className="pedido-card-header">
                  <div className="pedido-card-info">
                    <h3 className="pedido-card-title">Pedido #{pedido.id}</h3>
                    <p className="pedido-card-subtitle">
                      Mesa {pedido.mesa_numero ?? '—'} • {pedido.mozo_nombre ?? user?.nombre ?? '—'}
                    </p>
                  </div>
                  <div className="pedido-card-status">
                    <span className={`badge ${getEstadoClass(pedido.estado)}`}>
                      {getEstadoText(pedido.estado)}
                    </span>
                  </div>
                </div>

                <div className="pedido-card-body">
                  <h4 className="pedido-detalles-title">Detalles:</h4>
                  {(pedido.detalles ?? []).map((detalle, index) => (
                    <div key={index} className="pedido-detalle">
                      <span className="pedido-detalle-nombre">{detalle.producto_nombre ?? '—'}</span>
                      <span className="pedido-detalle-cantidad">x{detalle.cantidad}</span>
                      <span className="pedido-detalle-precio">
                        {toMoney(detalle.precio * detalle.cantidad)}
                      </span>
                      {detalle.notas && (
                        <span className="pedido-detalle-notas">Nota: {detalle.notas}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pedido-card-footer">
                  <div className="pedido-card-total">
                    <strong>Total: {toMoney(pedido.total)}</strong>
                  </div>
                  <div className="pedido-card-actions">
                    {pedido.estado === 'listo' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => actualizarEstadoPedido(pedido.id, 'entregado')}
                        >
                          Entregar
                        </button>
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => editarPedido(pedido)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => liberarMesa(pedido.id)}
                        >
                          Liberar Mesa
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PedidosPage;
