import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  mesaService,
  HAS_MESAS_ESTADO_ENDPOINT,
  HAS_MESAS_BY_ID_ENDPOINT,
} from '../../services/mesaService.js';
import { productoService } from '../../services/productoService.js';
import { pedidoService } from '../../services/pedidoService.js';
import { inventarioService } from '../../services/inventarioService.js';

const ACTIVE_STATES = ['pendiente', 'confirmado', 'preparando', 'listo'];
const LOCKED_DETAIL_STATES = ['listo'];

const PedidoForm = ({ onPedidoCreado, mesaSeleccionada, pedidoExistente }) => {

  const { user } = useAuth();

  const [mesasDisponibles, setMesasDisponibles] = useState([]);
  const [mesasNoDisponibles, setMesasNoDisponibles] = useState([]);

  const [productos, setProductos] = useState([]);
  const [selectedMesa, setSelectedMesa] = useState(mesaSeleccionada ? String(mesaSeleccionada) : '');
  const [items, setItems] = useState([]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [searchProducto, setSearchProducto] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todos');
  useEffect(() => {
    setSelectedMesa(mesaSeleccionada ? String(mesaSeleccionada) : '');
  }, [mesaSeleccionada]);

  // Cuando recibimos un pedido para editarlo, llenamos los campos automáticamente
useEffect(() => {
  if (pedidoExistente) {

    // Mesa del pedido
    setSelectedMesa(String(pedidoExistente.mesa_id));

    // Detalles del pedido
    const itemsCargados = (pedidoExistente.detalles ?? []).map(d => ({
      producto_id: d.producto_id,
      nombre: d.producto_nombre,
      precio: Number(d.precio),
      cantidad: Number(d.cantidad),
      notas: d.notas ?? "",
      estado: String(d.estado ?? '').toLowerCase(),
      cantidad_base: Number(d.cantidad),
    }));
    setItems(itemsCargados);

    // Notas generales del pedido (si usas notas)
    setNotas(pedidoExistente.notas ?? '');
  }
}, [pedidoExistente]);

  const isPedidoEntregado =
    String(pedidoExistente?.estado ?? '').toLowerCase() === 'entregado';

  const isDetalleBloqueado = (item) =>
    isPedidoEntregado && LOCKED_DETAIL_STATES.includes(String(item?.estado ?? '').toLowerCase());


  useEffect(() => {
    cargarMesas();
    cargarProductos();
    const handler = () => cargarMesas();
    window.addEventListener('mesa-status-changed', handler);
    return () => window.removeEventListener('mesa-status-changed', handler);
  }, []);

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

  const cargarMesas = async () => {
    try {
      const baseCruda = await mesaService.obtenerTodas();
      const base = (Array.isArray(baseCruda) ? baseCruda : []).map(m => ({
        ...m,
        estado: (m?.estado ?? 'disponible'),
        id: m?.id,
        numero: m?.numero ?? m?.id ?? '-',
      }));

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
    setMenuLoading(true);
    try {
      const [data, preparados, ingredientes] = await Promise.all([
        productoService.obtenerTodos(),
        inventarioService.obtenerProductosPreparados(),
        inventarioService.obtenerIngredientes(),
      ]);

      const preparadosMap = new Map(
        (Array.isArray(preparados) ? preparados : []).map((pp) => [
          Number(pp.id),
          pp,
        ]),
      );

      const ingredientesMap = new Map(
        (Array.isArray(ingredientes) ? ingredientes : []).map((ing) => [
          Number(ing.id),
          Number(ing.stock_actual ?? 0),
        ]),
      );

      const productosArray = Array.isArray(data) ? data : [];
      const productosGenerales = productosArray.filter(
        (p) => String(p.tipo_inventario || 'general').toLowerCase() === 'general',
      );

      const recetasEntries = await Promise.all(
        productosGenerales.map(async (productoGeneral) => {
          try {
            const receta = await productoService.obtenerReceta(productoGeneral.id);
            return [Number(productoGeneral.id), Array.isArray(receta) ? receta : []];
          } catch {
            return [Number(productoGeneral.id), []];
          }
        }),
      );

      const recetasPorProductoMap = new Map(recetasEntries);

      setProductos(
        productosArray.map(p => ({
          ...p,
          precio: typeof p.precio === 'number' ? p.precio : parseFloat(p.precio ?? 0),
          ...(String(p.tipo_inventario || 'general').toLowerCase() === 'preparado'
            ? (() => {
                const preparado = preparadosMap.get(Number(p.producto_preparado_id));
                const stockActual = Number(preparado?.stock_actual ?? 0);
                const unidad = preparado?.unidad || 'unidades';
                return {
                  stock_preparado_actual: stockActual,
                  disponibilidad_texto: preparado
                    ? `Disponible: ${stockActual} ${unidad}`
                    : 'Sin producto preparado asociado',
                  disponibilidad_nivel:
                    preparado && stockActual > 0 ? 'ok' : 'agotado',
                };
              })()
            : {
                ...( () => {
                  const receta = recetasPorProductoMap.get(Number(p.id)) || [];

                  if (receta.length === 0) {
                    return {
                      stock_general_disponible: 0,
                      disponibilidad_texto: 'Sin receta definida',
                      disponibilidad_nivel: 'agotado',
                    };
                  }

                  let maxUnidades = Number.POSITIVE_INFINITY;

                  for (const item of receta) {
                    const ingredienteId = Number(item.ingrediente_id);
                    const cantidadRequerida = Number(item.cantidad);
                    const stockActual = ingredientesMap.get(ingredienteId);

                    if (
                      !Number.isFinite(cantidadRequerida) ||
                      cantidadRequerida <= 0 ||
                      !Number.isFinite(stockActual)
                    ) {
                      maxUnidades = 0;
                      break;
                    }

                    const posibles = Math.floor(stockActual / cantidadRequerida);
                    maxUnidades = Math.min(maxUnidades, Math.max(0, posibles));
                  }

                  const unidadesDisponibles =
                    maxUnidades === Number.POSITIVE_INFINITY ? 0 : maxUnidades;

                  return {
                    stock_general_disponible: unidadesDisponibles,
                    disponibilidad_texto: `Disponible estimado: ${unidadesDisponibles} unidades`,
                    disponibilidad_nivel: unidadesDisponibles > 0 ? 'ok' : 'agotado',
                  };
                })(),
              }),
        }))
      );
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setProductos([]);
    } finally {
      setMenuLoading(false);
    }
  };
const productosFiltrados = productos.filter((producto) => {
  const coincideBusqueda =
    producto.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
    (producto.descripcion || '').toLowerCase().includes(searchProducto.toLowerCase());

  const coincideCategoria =
    categoriaActiva === 'todos' || producto.categoria === categoriaActiva;

  return coincideBusqueda && coincideCategoria;
});

const productosPorCategoria = {
  plato: productosFiltrados.filter(p => p.categoria === 'plato'),
  bebida: productosFiltrados.filter(p => p.categoria === 'bebida'),
  postre: productosFiltrados.filter(p => p.categoria === 'postre'),
  entrada: productosFiltrados.filter(p => p.categoria === 'entrada'),
};
  const agregarItem = (producto) => {
    const existingItem = items.find(item => item.producto_id === producto.id);
    const precioNum = typeof producto.precio === 'number' ? producto.precio : parseFloat(producto.precio ?? 0);
    const esPreparado = String(producto.tipo_inventario || '').toLowerCase() === 'preparado';
    const esGeneral = String(producto.tipo_inventario || '').toLowerCase() === 'general';

    if (esPreparado) {
      const stockDisponible = Number(producto.stock_preparado_actual ?? 0);
      const cantidadActual = existingItem ? Number(existingItem.cantidad) : 0;

      if (!Number.isFinite(stockDisponible) || stockDisponible <= 0) {
        alert(`No hay stock disponible para ${producto.nombre}`);
        return;
      }

      if (cantidadActual >= stockDisponible) {
        alert(`Stock disponible de ${producto.nombre}: ${stockDisponible}`);
        return;
      }
    }

    if (esGeneral) {
      const stockEstimado = Number(producto.stock_general_disponible ?? 0);
      const cantidadActual = existingItem ? Number(existingItem.cantidad) : 0;

      if (!Number.isFinite(stockEstimado) || stockEstimado <= 0) {
        alert(`No hay disponibilidad estimada para ${producto.nombre}`);
        return;
      }

      if (cantidadActual >= stockEstimado) {
        alert(`Disponibilidad estimada de ${producto.nombre}: ${stockEstimado}`);
        return;
      }
    }

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
        cantidad_base: 1,
        notas: '',
        estado: 'pendiente',
        tipo_inventario: producto.tipo_inventario,
        stock_preparado_actual: Number(producto.stock_preparado_actual ?? 0),
        stock_general_disponible: Number(producto.stock_general_disponible ?? 0),
      }]);
    }
  };

  const quitarItem = (index) => {
    const item = items[index];
    if (isDetalleBloqueado(item)) {
      alert('Este detalle está en estado listo y no se puede quitar cuando el pedido está entregado.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const actualizarCantidad = (index, cantidad) => {
    let qty = Number.parseInt(cantidad, 10);
    const itemActual = items[index];
    const minPermitido = isDetalleBloqueado(itemActual)
      ? Number(itemActual?.cantidad_base ?? itemActual?.cantidad ?? 1)
      : 1;

    if (Number.isFinite(qty) && qty < minPermitido) {
      qty = minPermitido;
      alert('Este detalle está en estado listo: solo puedes mantener o aumentar su cantidad.');
    }

    if (String(itemActual?.tipo_inventario || '').toLowerCase() === 'preparado') {
      const maxStock = Number(itemActual?.stock_preparado_actual ?? 0);

      if (Number.isFinite(maxStock) && maxStock > 0 && qty > maxStock) {
        qty = maxStock;
        alert(`Stock máximo disponible: ${maxStock}`);
      }
    }

    if (String(itemActual?.tipo_inventario || '').toLowerCase() === 'general') {
      const maxGeneral = Number(itemActual?.stock_general_disponible ?? 0);

      if (Number.isFinite(maxGeneral) && maxGeneral > 0 && qty > maxGeneral) {
        qty = maxGeneral;
        alert(`Disponibilidad estimada máxima: ${maxGeneral}`);
      }
    }

    if (!Number.isFinite(qty) || qty < minPermitido) {
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
      alert(`La mesa ${mesaSel.numero} está ${estadoLabel(mesaSel.estado).toLowerCase()}.`);
      setSelectedMesa('');
      return;
    }
    setSelectedMesa(val);
  };
const recheckMesaDisponible = async (mesaId) => {
  try {
      if (pedidoExistente) return true; // ← SOLUCIÓN

      const pedidos = await pedidoService.obtenerPorMesa(Number(mesaId));
      if (tienePedidoActivo(pedidos)) return false;

      if (HAS_MESAS_BY_ID_ENDPOINT) {
        try {
          const mesa = await mesaService.obtenerPorId(Number(mesaId));
          if (mesa && (mesa.estado ?? 'disponible') !== 'disponible') return false;
        } catch {}
      }
      return true;
  } catch {
    return false;
  }
};


const handleSubmit = async (e) => {
  e.preventDefault();
  if (!selectedMesa || items.length === 0) {
    alert('Selecciona una mesa disponible y añade productos');
    return;
  }

  setLoading(true);
  try {
    const ok = await recheckMesaDisponible(selectedMesa);
    if (!ok) {
      await cargarMesas();
      setLoading(false);
      alert('La mesa ya está ocupada o reservada.');
      return;
    }

    let response;

    // 🔥 EDICIÓN
    if (pedidoExistente) {
      const detallesNormalizados = items.map(i => ({
  producto_id: i.producto_id,
  cantidad: Number(i.cantidad),
  notas: i.notas,
  precio: Number(i.precio)
}));

response = await pedidoService.editarDetalles(pedidoExistente.id, detallesNormalizados);


    // 🔥 CREACIÓN
    } else {
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

      response = await pedidoService.crear(pedido);
    }

    if (HAS_MESAS_ESTADO_ENDPOINT) {
      try {
        await mesaService.actualizarEstado(Number(selectedMesa), 'ocupada');
      } catch (errMesa) {
        console.warn('[PedidoForm] No se pudo marcar mesa ocupada:', errMesa?.message || errMesa);
      }
    }

    setItems([]);
    setNotas('');
    setSelectedMesa('');

    if (typeof onPedidoCreado === 'function') onPedidoCreado(response);

    window.dispatchEvent(new CustomEvent('mesa-status-changed'));

    alert(pedidoExistente ? "Pedido actualizado correctamente" : "Pedido creado correctamente");

  } catch (error) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (typeof error?.response?.data === 'string' ? error.response.data : null) ||
      error.message;
    console.error('Error:', msg);
    alert(`Error: ${msg}`);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="pedido-form">
    <h3 className="pedido-form-title">
      {pedidoExistente ? `Editar Pedido #${pedidoExistente.id}` : "Nuevo Pedido"}
    </h3>


      <div className="pedido-form-section">
        <h4 className="pedido-form-subtitle">Seleccionar Mesa</h4>
        <select
          className="form-control"
          value={selectedMesa ?? ''}
          onChange={handleSelectMesa}
        >
          <option value="">Seleccionar una mesa...</option>
          {mesasDisponibles.length > 0 && (
            <optgroup label="Disponibles">
              {mesasDisponibles.map(mesa => (
                <option key={mesa.id} value={String(mesa.id)}>
                  Mesa {mesa.numero} (Capacidad: {mesa.capacidad})
                </option>
              ))}
            </optgroup>
          )}
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
      </div>

      <div className="pedido-form-layout">
        <div className="pedido-form-menu-column">
          <div className="pedido-form-section">
            <h4 className="pedido-form-subtitle">Menu</h4>

            <div className="pedido-productos-toolbar">
              <input
                type="text"
                className="form-control"
                placeholder="Buscar plato, bebida o postre..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value)}
                disabled={menuLoading}
              />

              <div className="pedido-categorias-tabs">
                <button
                  type="button"
                  className={`btn btn-sm ${categoriaActiva === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCategoriaActiva('todos')}
                  disabled={menuLoading}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${categoriaActiva === 'plato' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCategoriaActiva('plato')}
                  disabled={menuLoading}
                >
                  Platos
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${categoriaActiva === 'bebida' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCategoriaActiva('bebida')}
                  disabled={menuLoading}
                >
                  Bebidas
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${categoriaActiva === 'postre' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCategoriaActiva('postre')}
                  disabled={menuLoading}
                >
                  Postres
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${categoriaActiva === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCategoriaActiva('entrada')}
                  disabled={menuLoading}
                >
                  Entradas
                </button>
              </div>
            </div>

            {menuLoading && (
              <div className="pedido-menu-loading">Cargando menu...</div>
            )}

            {!menuLoading &&
              [
                { key: 'plato', label: '🍽️ Platos', data: productosPorCategoria.plato },
                { key: 'bebida', label: '🥤 Bebidas', data: productosPorCategoria.bebida },
                { key: 'postre', label: '🍰 Postres', data: productosPorCategoria.postre },
                { key: 'entrada', label: '🥗 Entradas', data: productosPorCategoria.entrada },
              ]
                .filter(section => categoriaActiva === 'todos' || categoriaActiva === section.key)
                .map(section => (
                  <div key={section.key} className="pedido-categoria-section">
                    <h5 className="pedido-categoria-title">{section.label}</h5>

                    {section.data.length === 0 ? (
                      <p className="pedido-categoria-empty">No hay productos en esta sección.</p>
                    ) : (
                      <div className="productos-grid">
                        {section.data.map(producto => (
                          (() => {
                            const stockPreparado = Number(producto.stock_preparado_actual ?? 0);
                            const stockGeneral = Number(producto.stock_general_disponible ?? 0);
                            const esPreparado =
                              String(producto.tipo_inventario || '').toLowerCase() === 'preparado';
                            const esGeneral =
                              String(producto.tipo_inventario || '').toLowerCase() === 'general';
                            const bloqueado =
                              menuLoading ||
                              (esPreparado && stockPreparado <= 0) ||
                              (esGeneral && stockGeneral <= 0);

                            return (
                          <div
                            key={producto.id}
                            className={`producto-card ${bloqueado ? 'producto-card-disabled' : ''}`}
                            onClick={() => {
                              if (bloqueado) return;
                              agregarItem(producto);
                            }}
                            role="button"
                            tabIndex={bloqueado ? -1 : 0}
                            onKeyDown={(e) => {
                              if (bloqueado) return;
                              if (e.key === 'Enter') agregarItem(producto);
                            }}
                          >
                            <div className="producto-info">
                              <h5 className="producto-nombre">{producto.nombre}</h5>
                              <p className="producto-precio">{toMoney(producto.precio)}</p>
                            </div>
                            <div className="producto-descripcion">
                              {producto.descripcion}
                            </div>
                            <div
                              className={`producto-disponibilidad producto-disponibilidad-${producto.disponibilidad_nivel || 'pendiente'}`}
                            >
                              {producto.disponibilidad_texto}
                            </div>
                          </div>
                            );
                          })()
                        ))}
                      </div>
                    )}
                  </div>
                ))}
          </div>
        </div>

        <div className="pedido-form-resumen-column">
          <div className="pedido-form-section">
            <h4 className="pedido-form-subtitle">Resumen del Pedido</h4>

            {items.length === 0 ? (
              <p className="pedido-resumen-vacio">Aun no agregaste productos.</p>
            ) : (
              <>
                <div className="pedido-items">
                  {items.map((item, index) => (
                    <div key={index} className="pedido-item">
                      <div className="pedido-item-info">
                        <span className="pedido-item-nombre">{item.nombre}</span>
                        <span className="pedido-item-precio">
                          {toMoney(item.precio)} x {item.cantidad}
                        </span>
                        {isDetalleBloqueado(item) && (
                          <span className="pedido-item-lock-hint">
                            Detalle listo: solo se permite aumentar.
                          </span>
                        )}
                      </div>
                      <div className="pedido-item-controls">
                        <input
                          type="number"
                          min={isDetalleBloqueado(item) ? Number(item.cantidad_base ?? item.cantidad ?? 1) : 1}
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
                          disabled={isDetalleBloqueado(item)}
                          title={isDetalleBloqueado(item)
                            ? 'No puedes quitar este detalle porque está listo y el pedido está entregado'
                            : 'Quitar detalle'}
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
              </>
            )}
          </div>

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
              disabled={loading}
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || !selectedMesa || items.length === 0}
            >
              {pedidoExistente
                ? (loading ? "Actualizando..." : "Actualizar Pedido")
                : (loading ? "Creando Pedido..." : "Crear Pedido")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedidoForm;
