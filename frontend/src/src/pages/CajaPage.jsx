import React, { useState, useEffect } from "react";
import { pedidoService } from "../services/pedidoService.js";
import { io } from "socket.io-client";
import { BACKEND_BASE_URL } from "../config/backend.js";

const socket = io(BACKEND_BASE_URL, {
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

const getTodayBoliviaDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
  }).format(new Date());

const normalizarCategoria = (categoria = "") =>
  String(categoria || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const esBebida = (categoria = "") => normalizarCategoria(categoria) === "bebida";

const filtrarDetallesCaja = (detalles = []) =>
  (Array.isArray(detalles) ? detalles : []).filter((d) =>
    esBebida(d?.producto_categoria),
  );

const CajaPage = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("preparando");
  const [fechaFiltro, setFechaFiltro] = useState(getTodayBoliviaDate());
  const [pedidoLoadingId, setPedidoLoadingId] = useState(null);

  const sortByFechaActualizacionAsc = (lista) => {
    return [...(Array.isArray(lista) ? lista : [])].sort((a, b) => {
      const fa = new Date(a?.fecha_actualizacion || 0).getTime();
      const fb = new Date(b?.fecha_actualizacion || 0).getTime();
      return fa - fb;
    });
  };

  const normalizePedido = (pedido) => ({
    ...pedido,
    detalles: Array.isArray(pedido?.detalles)
      ? pedido.detalles.map((d) => ({
          ...d,
          estado: d?.estado || "pendiente",
          ingredientes_ajustes: Array.isArray(d?.ingredientes_ajustes)
            ? d.ingredientes_ajustes
            : [],
        }))
      : [],
  });

  const normalizarPedidoCaja = (pedido) => {
    const base = normalizePedido(pedido);
    const detallesCaja = filtrarDetallesCaja(base.detalles);
    const totalDetalles = detallesCaja.length;
    const totalListos = detallesCaja.filter(
      (d) => String(d?.estado || "").toLowerCase() === "listo",
    ).length;
    const estadoModulo =
      totalDetalles > 0 && totalListos === totalDetalles ? "listo" : "preparando";

    return {
      ...base,
      detalles_modulo: detallesCaja,
      estado_modulo: estadoModulo,
    };
  };

  useEffect(() => {
    cargarPedidos();

    const onConnect = () => {
      console.log("✅ Socket caja conectado:", socket.id);
    };

    const onDisconnect = (reason) => {
      console.log("❌ Socket caja desconectado:", reason);
    };

    const onPedidoCreado = () => {
      cargarPedidos();
    };

    const onPedidoActualizado = () => {
      cargarPedidos();
    };

    const onPedidoEliminado = () => {
      cargarPedidos();
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

  const cargarPedidos = async () => {
    try {
      const data = await pedidoService.obtenerTodos(fechaFiltro);
      const normalizados = (Array.isArray(data) ? data : [])
        .map(normalizarPedidoCaja)
        .filter((p) => (p.detalles_modulo ?? []).length > 0)
        .filter((p) =>
          filtroEstado
            ? String(p.estado_modulo || "").toLowerCase() === filtroEstado
            : true,
        );

      setPedidos(sortByFechaActualizacionAsc(normalizados));
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstadoDetalles = async (pedido) => {
    try {
      const pedidoId = Number(pedido?.id);
      const detalleIds = (Array.isArray(pedido?.detalles_modulo)
        ? pedido.detalles_modulo
        : []
      ).map((d) => Number(d.id));

      if (!Number.isInteger(pedidoId) || pedidoId <= 0 || detalleIds.length === 0) {
        return;
      }

      setPedidoLoadingId(pedidoId);

      const pedidoActualizado = await pedidoService.actualizarEstadoDetalles(
        pedidoId,
        "listo",
        detalleIds,
      );

      const pedidoCajaActualizado = normalizarPedidoCaja(pedidoActualizado);

      setPedidos((prev) => {
        const existe = prev.some((p) => p.id === pedidoCajaActualizado.id);

        if (
          (pedidoCajaActualizado.detalles_modulo ?? []).length === 0 ||
          (filtroEstado &&
            String(pedidoCajaActualizado.estado_modulo || "").toLowerCase() !==
              filtroEstado)
        ) {
          return prev.filter((p) => p.id !== pedidoCajaActualizado.id);
        }

        if (filtroEstado === "" || pedidoCajaActualizado.estado_modulo === filtroEstado) {
          if (existe) {
            return sortByFechaActualizacionAsc(
              prev.map((p) =>
                p.id === pedidoCajaActualizado.id
                  ? pedidoCajaActualizado
                  : p,
              ),
            );
          }
          return sortByFechaActualizacionAsc([
            pedidoCajaActualizado,
            ...prev,
          ]);
        }

        return prev.filter((p) => p.id !== pedidoCajaActualizado.id);
      });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    } finally {
      setPedidoLoadingId(null);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case "preparando":
        return "badge-primary";
      case "listo":
        return "badge-success";
      default:
        return "badge-secondary";
    }
  };

  const getDetalleEstadoClass = (estado) => {
    const estadoDetalle = String(estado || "").toLowerCase();
    switch (estadoDetalle) {
      case "nuevo":
        return "cocina-detalle-nuevo";
      case "listo":
        return "cocina-detalle-listo";
      case "actualizado":
      case "modificado":
        return "cocina-detalle-modificado";
      default:
        return "cocina-detalle-pendiente";
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="cocina-container">
      <main className="cocina-content">
        <div className="container">
          <div className="cocina-controls">
            <h2 className="cocina-title">Pedidos en Caja</h2>
            <div className="cocina-filtros">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="form-select"
              >
                <option value="preparando">En Preparacion</option>
                <option value="listo">Listos para Entregar</option>
              </select>
              <input
                type="date"
                className="form-select cocina-fecha-input"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
              />
            </div>
          </div>

          <div className="pedidos-grid">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="pedido-card">
                <div className="pedido-header">
                  <div>
                    <h3 className="pedido-mesa">Pedido #{pedido.id}</h3>
                    <p className="pedido-mozo">
                      Mesa {pedido.mesa_numero ?? pedido.mesa_id ?? "-"}
                    </p>
                  </div>
                  <span className={`badge ${getEstadoColor(pedido.estado_modulo)}`}>
                    {pedido.estado_modulo}
                  </span>
                </div>

                <div className="pedido-items">
                  <h4>Items de caja (bebidas):</h4>
                  {(pedido.detalles_modulo ?? []).map((d, idx) => (
                    <div
                      key={idx}
                      className={`pedido-detalle ${getDetalleEstadoClass(d.estado)}`}
                    >
                      <div className="pedido-detalle-main">
                        <span>{d.producto_nombre ?? "-"}</span>
                        <span>x{d.cantidad}</span>
                        <span>{d.precio} Bs</span>
                        <span className="pedido-detalle-estado">{d.estado}</span>
                      </div>
                      {d.notas && (
                        <div className="pedido-detalle-nota">Nota: {d.notas}</div>
                      )}
                      {Array.isArray(d.ingredientes_ajustes) &&
                        d.ingredientes_ajustes.length > 0 && (
                          <div className="pedido-detalle-ajustes">
                            {d.ingredientes_ajustes.map((aj, ajIdx) => (
                              <span key={ajIdx} className="pedido-ajuste-pill">
                                Sin {aj.ingrediente_nombre || `#${aj.ingrediente_id}`}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                  <p className="pedido-total">Total: {pedido.total} Bs</p>
                </div>

                <div className="pedido-actions">
                  {pedido.estado_modulo === "preparando" && (
                    <button
                      className="btn btn-success"
                      onClick={() => actualizarEstadoDetalles(pedido)}
                      disabled={pedidoLoadingId === pedido.id}
                    >
                      {pedidoLoadingId === pedido.id
                        ? "Cargando..."
                        : "Marcar como Listo"}
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

export default CajaPage;
