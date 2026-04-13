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

const CocinaPage = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("preparando"); // 👈 Directo a "preparando"
  const [fechaFiltro, setFechaFiltro] = useState(getTodayBoliviaDate());

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
        }))
      : [],
  });

  useEffect(() => {
    cargarPedidos();

    const onConnect = () => {
      console.log("✅ Socket cocina conectado:", socket.id);
    };

    const onDisconnect = (reason) => {
      console.log("❌ Socket cocina desconectado:", reason);
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
      const data = await pedidoService.obtenerPorEstado(filtroEstado, fechaFiltro);
      setPedidos(sortByFechaActualizacionAsc(data.map(normalizePedido)));
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (id, nuevoEstado) => {
    try {
      const pedidoActualizado = await pedidoService.actualizarEstado(
        id,
        nuevoEstado,
      );

      setPedidos((prev) => {
        const existe = prev.some((p) => p.id === pedidoActualizado.id);

        if (pedidoActualizado.estado === filtroEstado || filtroEstado === "") {
          if (existe) {
            return sortByFechaActualizacionAsc(
              prev.map((p) =>
                p.id === pedidoActualizado.id
                  ? normalizePedido(pedidoActualizado)
                  : p,
              ),
            );
          }
          return sortByFechaActualizacionAsc([
            normalizePedido(pedidoActualizado),
            ...prev,
          ]);
        }

        return prev.filter((p) => p.id !== pedidoActualizado.id);
      });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
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
                      Mesa {pedido.mesa_numero ?? pedido.mesa_id ?? "—"}
                    </p>
                  </div>
                  <span className={`badge ${getEstadoColor(pedido.estado)}`}>
                    {pedido.estado}
                  </span>
                </div>

                <div className="pedido-items">
                  <h4>Items:</h4>
                  {(pedido.detalles ?? []).map((d, idx) => (
                    <div
                      key={idx}
                      className={`pedido-detalle ${getDetalleEstadoClass(d.estado)}`}
                    >
                      <span>{d.producto_nombre ?? "—"}</span>
                      <span>x{d.cantidad}</span>
                      <span>{d.precio} Bs</span>
                      <span className="pedido-detalle-estado">{d.estado}</span>
                      {d.notas && <span>Nota: {d.notas}</span>}
                    </div>
                  ))}
                  <p className="pedido-total">Total: {pedido.total} Bs</p>
                </div>

                <div className="pedido-actions">
                  {pedido.estado === "preparando" && (
                    <button
                      className="btn btn-success"
                      onClick={() => actualizarEstado(pedido.id, "listo")}
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
