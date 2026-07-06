import React, { useState, useEffect } from "react";
import { pedidoService } from "../services/pedidoService.js";
import PedidoForm from "../components/pedidos/PedidoForm.jsx";
import { io } from "socket.io-client";
import { BACKEND_BASE_URL } from "../config/backend.js";

const socket = io(BACKEND_BASE_URL, {
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const toMoney = (v) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(toNum(v));

const getTodayBoliviaDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
  }).format(new Date());

const FINAL_STATES = new Set(["cerrado", "cancelado"]);

const sortByFechaActualizacionAsc = (lista) =>
  [...(Array.isArray(lista) ? lista : [])].sort((a, b) => {
    const estadoA = String(a?.estado || "").toLowerCase();
    const estadoB = String(b?.estado || "").toLowerCase();
    const aEsFinal = FINAL_STATES.has(estadoA);
    const bEsFinal = FINAL_STATES.has(estadoB);

    if (aEsFinal !== bEsFinal) {
      return aEsFinal ? 1 : -1;
    }

    const fa = new Date(a?.fecha_actualizacion || 0).getTime();
    const fb = new Date(b?.fecha_actualizacion || 0).getTime();
    return fa - fb;
  });

const normalizePedido = (p) => {
  const detalles = Array.isArray(p?.detalles)
    ? p.detalles.map((d) => ({
        ...d,
        precio: toNum(d?.precio),
        cantidad: toNum(d?.cantidad),
      }))
    : [];

  const totalCalc = detalles.reduce((acc, d) => acc + d.precio * d.cantidad, 0);
  const total = toNum(p?.total) || totalCalc;
  const usuarioId = Number(p?.usuario_id);
  const usuarioNombre = p?.usuario_nombre ?? p?.mozo_nombre ?? null;

  return {
    ...p,
    usuario_id: Number.isFinite(usuarioId) ? usuarioId : null,
    usuario_nombre: usuarioNombre,
    estado: p?.estado ?? "preparando",
    detalles,
    total,
  };
};

const PedidosPage = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState(getTodayBoliviaDate());
  const [searchPedido, setSearchPedido] = useState("");
  // 🔥 Modal para edición
  const [showEditForm, setShowEditForm] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [pedidoAccionLoadingId, setPedidoAccionLoadingId] = useState(null);
  const [pedidoAccionLoadingTipo, setPedidoAccionLoadingTipo] = useState("");

  const closeNuevoPedidoModal = () => {
    setShowForm(false);
    setSelectedMesa(null);
  };

  const closeEditarPedidoModal = () => {
    setShowEditForm(false);
    setPedidoEditando(null);
  };

  useEffect(() => {
    const onConnect = () => {
      console.log("✅ Socket pedidos conectado:", socket.id);
    };

    const onDisconnect = (reason) => {
      console.log("❌ Socket pedidos desconectado:", reason);
    };

    const onPedidoCreado = () => {
      cargarPedidos();
    };

    const onPedidoActualizado = () => {
      cargarPedidos();
      window.dispatchEvent(new Event("mesa-status-changed"));
    };

    const onPedidoEliminado = () => {
      cargarPedidos();
      window.dispatchEvent(new Event("mesa-status-changed"));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("pedidoCreado", onPedidoCreado);
    socket.on("pedidoActualizado", onPedidoActualizado);
    socket.on("pedidoEliminado", onPedidoEliminado);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("pedidoCreado", onPedidoCreado);
      socket.off("pedidoActualizado", onPedidoActualizado);
      socket.off("pedidoEliminado", onPedidoEliminado);
    };
  }, [filtroEstado, fechaFiltro]);

  useEffect(() => {
    cargarPedidos();
  }, [filtroEstado, fechaFiltro]);

  const cargarPedidos = async () => {
    try {
      setLoading(true);
      const data = filtroEstado
        ? await pedidoService.obtenerPorEstado(filtroEstado, fechaFiltro)
        : await pedidoService.obtenerTodos(fechaFiltro);

      setPedidos(
        sortByFechaActualizacionAsc(
          (Array.isArray(data) ? data : []).map(normalizePedido),
        ),
      );
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePedidoCreado = () => {
    setShowForm(false);
    setSelectedMesa(null);
    setFiltroEstado("");
    cargarPedidos();
  };

  const actualizarEstadoPedido = async (id, estado) => {
    const pedidoId = Number(id);
    try {
      setPedidoAccionLoadingId(pedidoId);
      setPedidoAccionLoadingTipo(estado);

      await pedidoService.actualizarEstado(pedidoId, estado);
      await cargarPedidos();

      if (estado === "cancelado") {
        window.dispatchEvent(new Event("mesa-status-changed"));
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data ||
        error.message;
      console.error("Error al actualizar estado:", msg);
      alert(`No se pudo actualizar el estado: ${msg}`);
    } finally {
      setPedidoAccionLoadingId(null);
      setPedidoAccionLoadingTipo("");
    }
  };

  const cancelarPedido = async (pedido) => {
    try {
      const confirmacion = window.confirm(
        `¿Cancelar el pedido #${pedido.id}? Se devolverá el stock consumido.`,
      );

      if (!confirmacion) return;

      await actualizarEstadoPedido(pedido.id, "cancelado");
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data ||
        error.message;
      console.error("Error al cancelar pedido:", msg);
      alert(`No se pudo cancelar el pedido: ${msg}`);
    }
  };

  const editarPedido = (pedido) => {
    setPedidoEditando(pedido);
    setShowEditForm(true);
  };

  const liberarMesa = async (id) => {
    try {
      const confirmacion = window.confirm("¿Cerrar pedido y liberar mesa?");
      if (!confirmacion) return;

      const response = await pedidoService.liberarMesa(Number(id));
      const pedidoCerrado = response?.pedido;

      if (pedidoCerrado) {
        await cargarPedidos();
      }

      window.dispatchEvent(new Event("mesa-status-changed"));
      alert("Pedido cerrado y mesa liberada correctamente");
    } catch (error) {
      alert(error.message);
    }
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case "pendiente":
        return "badge-warning";
      case "preparando":
        return "badge-primary";
      case "listo":
        return "badge-success";
      case "entregado":
        return "badge-secondary";
      case "cancelado":
        return "badge-danger";
      case "cerrado":
        return "badge-dark";
      default:
        return "badge-secondary";
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case "pendiente":
        return "Pendiente";
      case "preparando":
        return "Preparando";
      case "listo":
        return "Listo";
      case "entregado":
        return "Entregado";
      case "cancelado":
        return "Cancelado";
      case "cerrado":
        return "Cerrado";
      default:
        return estado || "—";
    }
  };

  const getDetalleEstadoClass = (estado) => {
    const estadoDetalle = String(estado || "").toLowerCase();
    switch (estadoDetalle) {
      case "nuevo":
        return "pedido-detalle-nuevo";
      case "listo":
        return "pedido-detalle-listo";
      case "entregado":
        return "pedido-detalle-entregado";
      case "actualizado":
      case "modificado":
        return "pedido-detalle-modificado";
      default:
        return "pedido-detalle-pendiente";
    }
  };

  const getDetalleEstadoText = (estado) => {
    const estadoDetalle = String(estado || "").toLowerCase();
    switch (estadoDetalle) {
      case "nuevo":
        return "Nuevo";
      case "listo":
        return "Listo";
      case "entregado":
        return "Entregado";
      case "actualizado":
      case "modificado":
        return "Actualizado";
      case "preparando":
        return "Preparando";
      default:
        return "Pendiente";
    }
  };

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const texto = searchPedido.toLowerCase();

    const coincideNumero = String(pedido.id).includes(texto);

    const coincideProducto = (pedido.detalles || []).some((detalle) =>
      (detalle.producto_nombre || "").toLowerCase().includes(texto),
    );

    const coincideEstado = !filtroEstado || pedido.estado === filtroEstado;

    return (coincideNumero || coincideProducto || !texto) && coincideEstado;
  });
  if (loading) return <div>Cargando...</div>;

  return (
    <div className="pedidos-container">
      <main className="pedidos-content">
        <div className="container">
          <div className="pedidos-header-content">
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              Nuevo Pedido
            </button>
          </div>

          {/* Formulario para NUEVO pedido */}
          {showForm && (
            <div className="modal-overlay">
              <div className="modal-content modal-lg pedido-modal-content">
                <div className="pedido-modal-header">
                  <h2>Nuevo Pedido</h2>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm pedido-modal-close"
                    onClick={closeNuevoPedidoModal}
                  >
                    Cerrar
                  </button>
                </div>
                <PedidoForm
                  onPedidoCreado={handlePedidoCreado}
                  mesaSeleccionada={selectedMesa}
                />
              </div>
            </div>
          )}

          {/* Modal para EDITAR pedido */}
          {showEditForm && (
            <div className="modal-overlay">
              <div className="modal-content modal-lg pedido-modal-content">
                <div className="pedido-modal-header">
                  <h2>Editar Pedido #{pedidoEditando?.id}</h2>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm pedido-modal-close"
                    onClick={closeEditarPedidoModal}
                  >
                    Cerrar
                  </button>
                </div>
                <PedidoForm
                  pedidoExistente={pedidoEditando}
                  onPedidoCreado={() => {
                    closeEditarPedidoModal();
                    cargarPedidos();
                  }}
                />
              </div>
            </div>
          )}

          <div className="pedidos-filters">
            <div className="pedidos-filters-group">
              <label className="form-label">Filtrar por estado:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por número o nombre del producto..."
                value={searchPedido}
                onChange={(e) => setSearchPedido(e.target.value)}
              />
              <select
                className="form-control"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="preparando">Preparando</option>
                <option value="listo">Listo</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
                <option value="cerrado">Cerrado</option>
              </select>
              <input
                type="date"
                className="form-control"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
              />
            </div>
          </div>

          <div className="pedidos-grid">
            {pedidosFiltrados.map((pedido) => (
              <div key={pedido.id} className="pedido-card">
                <div className="pedido-card-header">
                  <div className="pedido-card-info">
                    <h3 className="pedido-card-title">Pedido #{pedido.id}</h3>
                    <p className="pedido-card-subtitle">
                      Mesa {pedido.mesa_numero ?? pedido.mesa_id ?? "—"} •{" "}
                      {pedido.usuario_nombre ??
                        pedido.mozo_nombre ??
                        (pedido.usuario_id
                          ? `Usuario #${pedido.usuario_id}`
                          : "—")}
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
                    <div
                      key={index}
                      className={`pedido-detalle ${getDetalleEstadoClass(detalle.estado)}`}
                    >
                      <div className="pedido-detalle-main">
                        <span className="pedido-detalle-nombre">
                          {detalle.producto_nombre ?? "—"}
                        </span>
                        <span className="pedido-detalle-cantidad">
                          x{detalle.cantidad}
                        </span>
                        <span className="pedido-detalle-precio">
                          {toMoney(detalle.precio * detalle.cantidad)}
                        </span>
                        <span className="pedido-detalle-estado">
                          {getDetalleEstadoText(detalle.estado)}
                        </span>
                      </div>
                      {detalle.notas && (
                        <span className="pedido-detalle-notas">
                          Nota: {detalle.notas}
                        </span>
                      )}

                      {Array.isArray(detalle.ingredientes_ajustes) &&
                        detalle.ingredientes_ajustes.length > 0 && (
                          <div className="pedido-detalle-ajustes">
                            {detalle.ingredientes_ajustes.map((aj, ajIdx) => (
                              <span key={ajIdx} className="pedido-ajuste-pill">
                                Sin {aj.ingrediente_nombre || `#${aj.ingrediente_id}`}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                <div className="pedido-card-footer">
                  <div className="pedido-card-total">
                    <strong>Total: {toMoney(pedido.total)}</strong>
                  </div>
                  <div className="pedido-card-actions">
                    {pedido.estado !== "cerrado" &&
                      pedido.estado !== "cancelado" && (
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => editarPedido(pedido)}
                          disabled={pedidoAccionLoadingId === pedido.id}
                        >
                          Editar
                        </button>
                      )}

                    {pedido.estado === "listo" && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() =>
                          actualizarEstadoPedido(pedido.id, "entregado")
                        }
                        disabled={pedidoAccionLoadingId === pedido.id}
                      >
                        {pedidoAccionLoadingId === pedido.id &&
                        pedidoAccionLoadingTipo === "entregado"
                          ? "Cargando..."
                          : "Entregar"}
                      </button>
                    )}

                    {(pedido.estado === "listo" ||
                      pedido.estado === "pendiente" ||
                      pedido.estado === "preparando") && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => cancelarPedido(pedido)}
                        disabled={pedidoAccionLoadingId === pedido.id}
                      >
                        {pedidoAccionLoadingId === pedido.id &&
                        pedidoAccionLoadingTipo === "cancelado"
                          ? "Cargando..."
                          : "Cancelar"}
                      </button>
                    )}

                    {pedido.estado === "entregado" && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => liberarMesa(pedido.id)}
                      >
                        Cerrar Pedido
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
