import React, { useState, useEffect } from "react";
import { mesaService } from "../services/mesaService.js";
import { pedidoService } from "../services/pedidoService.js";

const ACTIVE_STATES = ["pendiente", "confirmado", "preparando", "listo"];

const MesasPage = () => {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ capacidad: 4 });
  const [editingMesa, setEditingMesa] = useState(null);

  const closeMesaModal = () => {
    setShowForm(false);
    setEditingMesa(null);
    setFormData({ numero: "", capacidad: 4 });
  };

  useEffect(() => {
    cargarMesas();

    const handler = () => cargarMesas();
    window.addEventListener("mesa-status-changed", handler);
    return () => window.removeEventListener("mesa-status-changed", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tienePedidoActivo = (pedidos) =>
    Array.isArray(pedidos) &&
    pedidos.some((p) =>
      ACTIVE_STATES.includes((p?.estado || "").toLowerCase()),
    );

  const infiereEstadoMesa = (mesaBase, pedidosDeMesa) => {
    const estadoBase = (mesaBase?.estado ?? "disponible").toLowerCase();
    if (estadoBase !== "disponible") return estadoBase;
    return tienePedidoActivo(pedidosDeMesa) ? "ocupada" : "disponible";
  };

  const obtenerPedidosDeMesa = async (mesaId) => {
    try {
      const arr = await pedidoService.obtenerPorMesa(Number(mesaId));
      return Array.isArray(arr) ? arr : [];
    } catch {
      try {
        const todos = await pedidoService.obtenerTodos();
        return (Array.isArray(todos) ? todos : []).filter(
          (p) => Number(p.mesa_id) === Number(mesaId),
        );
      } catch {
        return [];
      }
    }
  };

  const cargarMesas = async () => {
    setLoading(true);
    try {
      const base = await mesaService.obtenerTodas();
      const lista = (Array.isArray(base) ? base : []).map((m) => ({
        ...m,
        id: m?.id,
        numero: m?.numero ?? m?.id ?? "-",
        estado: m?.estado ?? "disponible",
      }));

      const pedidosPorMesa = await Promise.all(
        lista.map((m) => obtenerPedidosDeMesa(m.id)),
      );

      const enriquecidas = lista.map((m, i) => ({
        ...m,
        estado: infiereEstadoMesa(m, pedidosPorMesa[i]),
      }));

      setMesas(enriquecidas);
    } catch (error) {
      console.error("Error al cargar mesas:", error);
      setMesas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMesa) {
        await mesaService.actualizar(editingMesa.id, formData);
      } else {
        await mesaService.crear(formData);
      }

      closeMesaModal();
      cargarMesas();
    } catch (error) {
      console.error("Error al guardar mesa:", error);
    }
  };

  const handleEdit = (mesa) => {
    setEditingMesa(mesa);
    setFormData({ numero: mesa.numero, capacidad: mesa.capacidad });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta mesa?")) {
      try {
        await mesaService.eliminar(id);
        cargarMesas();
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const mesa = mesas.find((m) => m.id === id);
      if (
        ["ocupada", "reservada"].includes(mesa.estado) &&
        nuevoEstado === "disponible"
      ) {
        const pedidos = await obtenerPedidosDeMesa(id);
        if (tienePedidoActivo(pedidos)) {
          alert(
            'La mesa tiene un pedido activo. No se puede marcar como "Disponible" hasta cerrarlo.',
          );
          return;
        }
      }
      await mesaService.actualizar(id, { ...mesa, estado: nuevoEstado });
      await cargarMesas();
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  const getMesaClass = (estado) => {
    switch ((estado || "").toLowerCase()) {
      case "disponible":
        return "mesa-card-disponible";
      case "ocupada":
        return "mesa-card-ocupada";
      case "reservada":
        return "mesa-card-reservada";
      default:
        return "mesa-card-disponible";
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="mesas-container">
      <main className="mesas-content">
        <div className="container">
          <div className="mesas-header-content">
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingMesa(null);
                setFormData({ numero: "", capacidad: 4 });
                setShowForm(true);
              }}
            >
              Nueva Mesa
            </button>
          </div>

          {showForm && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 className="mesa-form-title">
                  {editingMesa ? "Editar Mesa" : "Nueva Mesa"}
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="mesa-form-group">
                    <label className="mesa-form-label">Capacidad</label>
                    <input
                      type="number"
                      className="mesa-form-input"
                      value={formData.capacidad}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacidad: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      min="1"
                      required
                    />
                  </div>
                  <div className="mesa-form-actions">
                    <button
                      type="submit"
                      className="mesa-form-btn mesa-form-btn-primary"
                    >
                      {editingMesa ? "Actualizar" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      className="mesa-form-btn mesa-form-btn-secondary"
                      onClick={closeMesaModal}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="mesas-grid">
            {mesas.map((mesa) => (
              <div
                key={mesa.id}
                className={`mesa-card ${getMesaClass(mesa.estado)}`}
              >
                <h3 className="mesa-number">{mesa.numero}</h3>
                <p className="mesa-capacidad">
                  Capacidad: {mesa.capacidad} personas
                </p>
                <div className="mesa-status">
                  <select
                    value={mesa.estado || "disponible"}
                    onChange={(e) => cambiarEstado(mesa.id, e.target.value)}
                    className="mesa-status-select"
                    disabled={["ocupada", "reservada"].includes(
                      (mesa.estado || "").toLowerCase(),
                    )}
                  >
                    <option value="disponible">Disponible</option>
                    <option value="ocupada">Ocupada</option>
                    <option value="reservada">Reservada</option>
                  </select>
                </div>
                <div className="mesa-actions">
                  <button
                    className="mesa-btn mesa-btn-edit"
                    onClick={() => handleEdit(mesa)}
                  >
                    Editar
                  </button>
                  <button
                    className="mesa-btn mesa-btn-delete"
                    onClick={() => handleDelete(mesa.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MesasPage;
