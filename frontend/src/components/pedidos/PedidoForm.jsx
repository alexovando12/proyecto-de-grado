import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  mesaService,
  HAS_MESAS_ESTADO_ENDPOINT,
  HAS_MESAS_BY_ID_ENDPOINT,
} from '../../services/mesaService.js';
import { productoService } from '../../services/productoService.js';
import { pedidoService } from '../../services/pedidoService.js';

const ACTIVE_STATES = ['pendiente', 'confirmado', 'preparando', 'listo'];

const PedidoForm = ({ onPedidoCreado, mesaSeleccionada }) => {
  const { user } = useAuth();

  const [mesasDisponibles, setMesasDisponibles] = useState([]);
  const [mesasNoDisponibles, setMesasNoDisponibles] = useState([]);

  const [productos, setProductos] = useState([]);
  const [selectedMesa, setSelectedMesa] = useState(mesaSeleccionada ? String(mesaSeleccionada) : '');
  const [items, setItems] = useState([]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  // Sincroniza si cambia la mesa seleccionada desde el padre
  useEffect(() => {
    setSelectedMesa(mesaSeleccionada ? String(mesaSeleccionada) : '');
  }, [mesaSeleccionada]);

  // Carga inicial y refresco cuando otro componente anuncie cambios
  useEffect(() => {
    cargarMesas();
    cargarProductos();

    const handler = () => cargarMesas();
    window.addEventListener('mesa-status-changed', handler);
    return () => window.removeEventListener('mesa-status-changed', handler);
  }, []);

  /* ---------- Helpers ---------- */
  const toMoney = (v) => {
    const n = Number(String(v ?? '').replace(',', '.'));
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2,
    }).format(n);
  };

  const estadoLabel = (estado) => {
    const e = (estado || '').toLowerCase();
    if (e === 'ocupada') return 'Ocupada';
    if (e === 'reservada') return 'Reservada';
    if (e === 'disponible') return 'Disponible';
    return e || '—';
  };

  const tienePedidoActivo = (pedidos) =>
    Array.isArray(pedidos) && pedidos.some(p => ACTIVE_STATES.includes((p?.estado || '').toLowerCase()));

  const normalizaMesa = (m, ocupadaPorPedido) => {
    const estadoBase = (m?.estado ?? 'disponible').toLowerCase();
    const virtualEstado =
      estadoBase !== 'disponible' ? estadoBase : (ocupadaPorPedido ? 'ocupada' : 'disponible');

    return {
      ...m,
      id: m?.id,
      numero: m?.numero ?? m?.id ?? '-',
      estado: virtualEstado,
    };
  };

  /* ---------- Data loaders ---------- */
  const cargarMesas = async () => {
    try {
      // 1) Cargar todas las mesas
      const baseCruda = await mesaService.obtenerTodas();
      const base = (Array.isArray(baseCruda) ? baseCruda : []).map(m => ({
        ...m,
        estado: (m?.estado ?? 'disponible'),
        id: m?.id,
        numero: m?.numero ?? m?.id ?? '-',
      }));

      // 2) Para cada mesa, consultar si tiene pedidos activos
      const pedidosPorMesa = await Promise.all(
        base.map(async (m) => {
          try {
            const pedidos = await pedidoService.obtenerPorMesa(Number(m.id));
            return Array.isArray(pedidos) ? pedidos : [];
          } catch {
            return [];
          }
        })
      );

      const enriquecidas = base.map((m, i) =>
        normalizaMesa(m, tienePedidoActivo(pedidosPorMesa[i]))
      );

      const disp = enriquecidas.filter(m => (m.estado ?? 'disponible') === 'disponible');
      const noDisp = enriquecidas.filter(m => (m.estado ?? 'disponible') !== 'disponible');

      setMesasDisponibles(disp);
      setMesasNoDisponibles(noDisp);

      // Si la mesa seleccionada ya no está disponible, resetea
      if (selectedMesa) {
        const mesaSel = enriquecidas.find(m => String(m.id) === String(selectedMesa));
        if (!mesaSel || (mesaSel.estado ?? 'disponible') !== 'disponible') {
          setSelectedMesa('');
        }
      }
    } catch (error) {
      console.error('Error al cargar mesas:', error);
      setMesasDisponibles([]);
      setMesasNoDisponibles([]);
      setSelectedMesa('');
    }
  };

  const cargarProductos = async () => {
    try {
      const data = await productoService.obtenerTodos();
      setProductos(
        (Array.isArray(data) ? data : []).map(p => ({
          ...p,
          precio: typeof p.precio === 'number' ? p.precio : parseFloat(p.precio ?? 0),
        }))
      );
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setProductos([]);
    }
  };

  /* ---------- Items ---------- */
  const agregarItem = (producto) => {
    const existingItem = items.find(item => item.producto_id === producto.id);
    const precioNum = typeof producto.precio === 'number' ? producto.precio : parseFloat(producto.precio ?? 0);

    if (existingItem) {
      setItems(items.map(item =>
        item.producto_id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setItems([...items, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: Number.isFinite(precioNum) ? precioNum : 0,
        cantidad: 1,
        notas: ''
      }]);
    }
  };

  const quitarItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const actualizarCantidad = (index, cantidad) => {
    const qty = Number.parseInt(cantidad, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      quitarItem(index);
    } else {
      setItems(items.map((item, i) =>
        i === index ? { ...item, cantidad: qty } : item
      ));
    }
  };

  const actualizarNotas = (index, notas) => {
    setItems(items.map((item, i) =>
      i === index ? { ...item, notas } : item
    ));
  };

  const calcularTotal = () => {
    return items.reduce((total, item) => total + (Number(item.precio) * Number(item.cantidad)), 0);
  };

  /* ---------- Selección de mesa ---------- */
  const handleSelectMesa = (e) => {
    const val = e.target.value;
    if (val === '') {
      setSelectedMesa('');
      return;
    }
    const all = [...mesasDisponibles, ...mesasNoDisponibles];
    const mesaSel = all.find(m => String(m.id) === String(val));
    if (!mesaSel) {
      setSelectedMesa('');
      return;
    }
    if ((mesaSel.estado ?? 'disponible') !== 'disponible') {
      alert(`La mesa ${mesaSel.numero} está ${estadoLabel(mesaSel.estado).toLowerCase()}. No se puede seleccionar.`);
      setSelectedMesa('');
      return;
    }
    setSelectedMesa(val);
  };

  /* ---------- Verificación final antes de crear ---------- */
  const recheckMesaDisponible = async (mesaId) => {
    try {
      // Revisa pedidos activos de esa mesa
      const pedidos = await pedidoService.obtenerPorMesa(Number(mesaId));
      if (tienePedidoActivo(pedidos)) return false;

      // Solo si tu backend tiene GET /mesas/:id, corroboramos el estado visible
      if (HAS_MESAS_BY_ID_ENDPOINT) {
        try {
          const mesa = await mesaService.obtenerPorId(Number(mesaId));
          if (mesa && (mesa.estado ?? 'disponible') !== 'disponible') return false;
        } catch {/* ignoramos */}
      }
      return true;
    } catch {
      // Por seguridad, si falla la verificación, bloqueamos
      return false;
    }
  };

  /* ---------- Submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMesa || items.length === 0) {
      alert('Por favor selecciona una mesa disponible y añade productos');
      return;
    }

    setLoading(true);
    try {
      // Verificación final en backend
      const ok = await recheckMesaDisponible(selectedMesa);
      if (!ok) {
        await cargarMesas();
        setLoading(false);
        alert('No se puede crear el pedido: la mesa ya está ocupada o reservada.');
        return;
      }

      const pedido = {
        mesa_id: Number(selectedMesa),
        usuario_id: user?.id,
        detalles: items.map(item => ({
          producto_id: item.producto_id,
          cantidad: Number(item.cantidad),
          notas: item.notas,
          precio: Number(item.precio),
        })),
        notas: notas?.trim() || undefined,
      };

      const response = await pedidoService.crear(pedido);

      // Intento de marcar mesa ocupada SOLO si tu backend lo soporta (no habrá 404)
      if (HAS_MESAS_ESTADO_ENDPOINT) {
        try {
          await mesaService.actualizarEstado(Number(selectedMesa), 'ocupada');
        } catch (errMesa) {
          console.warn('[PedidoForm] No se pudo marcar mesa ocupada:', errMesa?.message || errMesa);
        }
      }

      // Limpieza + refrescos
      setItems([]);
      setNotas('');
      setSelectedMesa('');
      if (typeof onPedidoCreado === 'function') onPedidoCreado(response);
      window.dispatchEvent(new CustomEvent('mesa-status-changed'));

      alert('Pedido creado exitosamente');
    } catch (error) {
      const msg = error?.response?.data?.message || error?.response?.data || error.message;
      console.error('Error al crear pedido:', msg);
      alert(`Error al crear el pedido: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="pedido-form">
      <h3 className="pedido-form-title">Nuevo Pedido</h3>

      <div className="pedido-form-section">
        <h4 className="pedido-form-subtitle">Seleccionar Mesa</h4>
        <select
          className="form-control"
          value={selectedMesa ?? ''}
          onChange={handleSelectMesa}
        >
          <option value="">Seleccionar una mesa...</option>

          {/* Disponibles (seleccionables) */}
          {mesasDisponibles.length > 0 && (
            <optgroup label="Disponibles">
              {mesasDisponibles.map(mesa => (
                <option key={mesa.id} value={String(mesa.id)}>
                  Mesa {mesa.numero} (Capacidad: {mesa.capacidad})
                </option>
              ))}
            </optgroup>
          )}

          {/* No disponibles (deshabilitadas) */}
          {mesasNoDisponibles.length > 0 && (
            <optgroup label="No disponibles">
              {mesasNoDisponibles.map(mesa => (
                <option key={mesa.id} value={String(mesa.id)} disabled>
                  Mesa {mesa.numero} — {estadoLabel(mesa.estado)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <small className="form-text">
          Las mesas ocupadas o reservadas aparecen deshabilitadas.
        </small>
      </div>

      <div className="pedido-form-section">
        <h4 className="pedido-form-subtitle">Productos</h4>
        <div className="productos-grid">
          {productos.map(producto => (
            <div
              key={producto.id}
              className="producto-card"
              onClick={() => agregarItem(producto)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' ? agregarItem(producto) : null)}
            >
              <div className="producto-info">
                <h5 className="producto-nombre">{producto.nombre}</h5>
                <p className="producto-precio">{toMoney(producto.precio)}</p>
              </div>
              <div className="producto-descripcion">
                {producto.descripcion}
              </div>
            </div>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div className="pedido-form-section">
          <h4 className="pedido-form-subtitle">Detalle del Pedido</h4>
          <div className="pedido-items">
            {items.map((item, index) => (
              <div key={index} className="pedido-item">
                <div className="pedido-item-info">
                  <span className="pedido-item-nombre">{item.nombre}</span>
                  <span className="pedido-item-precio">
                    {toMoney(item.precio)} x {item.cantidad}
                  </span>
                </div>
                <div className="pedido-item-controls">
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => actualizarCantidad(index, e.target.value)}
                    className="pedido-item-cantidad"
                  />
                  <input
                    type="text"
                    placeholder="Notas"
                    value={item.notas}
                    onChange={(e) => actualizarNotas(index, e.target.value)}
                    className="pedido-item-notas"
                  />
                  <button
                    type="button"
                    onClick={() => quitarItem(index)}
                    className="btn btn-danger btn-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="pedido-total">
            <strong>Total: {toMoney(calcularTotal())}</strong>
          </div>
        </div>
      )}

      <div className="pedido-form-section">
        <h4 className="pedido-form-subtitle">Notas Generales</h4>
        <textarea
          className="form-control"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Notas adicionales para el pedido..."
          rows="3"
        />
      </div>

      <div className="pedido-form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setItems([]);
            setNotas('');
            setSelectedMesa('');
          }}
        >
          Limpiar
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || !selectedMesa || items.length === 0}
        >
          {loading ? 'Creando Pedido...' : 'Crear Pedido'}
        </button>
      </div>
    </div>
  );
};

export default PedidoForm;
