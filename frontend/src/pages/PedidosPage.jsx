import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext.jsx";
import { pedidoService } from "../services/pedidoService.js";
import PedidoForm from "../components/pedidos/PedidoForm.jsx";

/* ===== Helpers de normalización y formato ===== */
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

  // Si backend no manda total o lo manda como string, lo calculamos/normalizamos
  const totalCalc = detalles.reduce((acc, d) => acc + d.precio * d.cantidad, 0);
  const total = toNum(p?.total) || totalCalc;

  return {
    ...p,
    estado: p?.estado ?? 'pendiente',
    detalles,
    total,
  };
};
/* ============================================= */

const PedidosPage = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState(''); // '' = todos

  useEffect(() => {
    cargarPedidos();
  }, []);

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

  const cargarPedidosPorEstado = async (estado) => {
    try {
      setLoading(true);
      if (!estado) {
        await cargarPedidos();
        return;
      }
      const data = await pedidoService.obtenerPorEstado(estado);
      setPedidos((Array.isArray(data) ? data : []).map(normalizePedido));
    } catch (error) {
      console.error('Error al filtrar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePedidoCreado = () => {
    setShowForm(false);
    setSelectedMesa(null);
    setFiltroEstado(''); // volvemos a mostrar todos
    cargarPedidos();
  };

const actualizarEstadoPedido = async (id, estado) => {
  try {
    // 🔒 Opcional: valida estados permitidos para no romper el backend
    const ALLOWED = ['pendiente','confirmado','preparando','listo','entregado']; // quita 'cancelado' si tu backend no lo soporta
    if (!ALLOWED.includes(estado)) {
      alert(`Estado "${estado}" no permitido por el frontend`);
      return;
    }

    await pedidoService.actualizarEstado(Number(id), estado);
    await cargarPedidosPorEstado(filtroEstado);
  } catch (error) {
    // 👇 esto te muestra el detalle que manda el backend
    const msg = error?.response?.data?.message || error?.response?.data || error.message;
    console.error('Error al actualizar estado:', msg);
    alert(`No se pudo actualizar el estado: ${msg}`);
  }
};


  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'pendiente':   return 'badge-warning';
      case 'confirmado':  return 'badge-info';
      case 'preparando':  return 'badge-primary';
      case 'listo':       return 'badge-success';
      case 'entregado':   return 'badge-secondary';
      case 'cancelado':   return 'badge-danger';
      default:            return 'badge-secondary';
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'pendiente':   return 'Pendiente';
      case 'confirmado':  return 'Confirmado';
      case 'preparando':  return 'Preparando';
      case 'listo':       return 'Listo';
      case 'entregado':   return 'Entregado';
      case 'cancelado':   return 'Cancelado';
      default:            return estado || '—';
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="pedidos-container">
      <header className="pedidos-header">
        <div className="pedidos-header-content">
          <div>
            <h1 className="pedidos-title">Toma de Pedidos</h1>
          </div>
          <div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Nuevo Pedido
            </button>
          </div>
        </div>
      </header>

      <main className="pedidos-content">
        <div className="container">
          {showForm && (
            <PedidoForm
              onPedidoCreado={handlePedidoCreado}
              mesaSeleccionada={selectedMesa}
            />
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
                  await cargarPedidosPorEstado(estado);
                }}
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="confirmado">Confirmado</option>
                <option value="preparando">Preparando</option>
                <option value="listo">Listo</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
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
                      {/* Fallbacks por si el backend no envía esos campos */}
                      Mesa {pedido.mesa_numero ?? pedido?.mesa?.numero ?? '—'} • {pedido.mozo_nombre ?? pedido?.mozo?.nombre ?? user?.nombre ?? '—'}
                    </p>
                  </div>
                  <div className="pedido-card-status">
                    <span className={`badge ${getEstadoClass(pedido.estado)}`}>
                      {getEstadoText(pedido.estado)}
                    </span>
                  </div>
                </div>

                <div className="pedido-card-body">
                  <div className="pedido-detalles">
                    <h4 className="pedido-detalles-title">Detalles:</h4>
                    {(pedido.detalles ?? []).map((detalle, index) => (
                      <div key={index} className="pedido-detalle">
                        <span className="pedido-detalle-nombre">{detalle.nombre ?? '—'}</span>
                        <span className="pedido-detalle-cantidad">x{detalle.cantidad}</span>
                        <span className="pedido-detalle-precio">
                          {toMoney(detalle.precio * detalle.cantidad)}
                        </span>
                        {detalle.notas && (
                          <span className="pedido-detalle-notas">
                            Nota: {detalle.notas}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pedido-card-footer">
                  <div className="pedido-card-total">
                    <strong>Total: {toMoney(pedido.total)}</strong>
                  </div>
                  <div className="pedido-card-actions">
                    {pedido.estado === 'pendiente' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => actualizarEstadoPedido(pedido.id, 'confirmado')}
                        >
                          Confirmar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => actualizarEstadoPedido(pedido.id, 'cancelado')}
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {pedido.estado === 'confirmado' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => actualizarEstadoPedido(pedido.id, 'preparando')}
                      >
                        Enviar a Cocina
                      </button>
                    )}

                    {pedido.estado === 'preparando' && (
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => actualizarEstadoPedido(pedido.id, 'listo')}
                      >
                        Marcar como Listo
                      </button>
                    )}

                    {pedido.estado === 'listo' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => actualizarEstadoPedido(pedido.id, 'entregado')}
                      >
                        Entregar
                      </button>
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
