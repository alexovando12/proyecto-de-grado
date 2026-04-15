import React, { useState, useEffect } from "react";
import { productoService } from "../services/productoService.js";
import api from "../services/api.js"; // 👈 agrega esta línea arriba de todo

const ProductosPage = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState(null);
  const [ingredientes, setIngredientes] = useState([]);
  const [receta, setReceta] = useState([]);
  const [productosPreparados, setProductosPreparados] = useState([]);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    categoria: "plato",
    tipo_inventario: "general",
    producto_preparado_id: null,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const [filteredProductos, setFilteredProductos] = useState([]);

  const closeProductoModal = () => {
    setShowForm(false);
    setEditingProducto(null);
    setReceta([]);
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      categoria: "plato",
      tipo_inventario: "general",
      producto_preparado_id: null,
    });
  };

  const categorias = [
    { value: "todos", label: "Todas las categorías" },
    { value: "plato", label: "Platos" },
    { value: "bebida", label: "Bebidas" },
    { value: "postre", label: "Postres" },
    { value: "entrada", label: "Entradas" },
  ];

  const tiposInventario = [
    { value: "general", label: "Inventario General (Platos por preparar)" },
    { value: "preparado", label: "Productos Preparados" },
  ];

  // =======================
  // useEffects principales
  // =======================
  useEffect(() => {
    cargarProductos();
    cargarIngredientes();
    cargarProductosPreparados();
  }, []);

  useEffect(() => {
    filtrarProductos();
  }, [productos, searchTerm, categoriaFiltro]);

  // =======================
  // Funciones de carga
  // =======================
  const cargarProductos = async () => {
    try {
      const data = await productoService.obtenerTodos();
      setProductos(data);
      return data;
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError(
        error?.response?.data?.error ||
          error?.message ||
          "Error al cargar productos",
      );
      return [];
    } finally {
      setLoading(false);
    }
  };

  const cargarIngredientes = async () => {
    try {
      const response = await api.get("/inventario/ingredientes");
      const data = Array.isArray(response.data) ? response.data : [];
      setIngredientes(data);
    } catch (error) {
      console.error("Error al cargar ingredientes:", error);
      setIngredientes([]); // evita que sea undefined
    }
  };

  const cargarProductosPreparados = async () => {
    try {
      const response = await api.get("/inventario/productos-preparados");
      const data = Array.isArray(response.data) ? response.data : [];
      setProductosPreparados(data);
    } catch (error) {
      console.error("Error al cargar productos preparados:", error);
      setProductosPreparados([]);
    }
  };

  // =======================
  // Filtros y búsqueda
  // =======================
  const filtrarProductos = () => {
    let filtrados = productos;

    if (categoriaFiltro !== "todos") {
      filtrados = filtrados.filter((p) => p.categoria === categoriaFiltro);
    }

    if (searchTerm) {
      filtrados = filtrados.filter(
        (p) =>
          p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredProductos(filtrados);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      if (searchTerm.trim()) {
        const resultados = await productoService.buscar(searchTerm);
        setFilteredProductos(resultados);
      } else {
        filtrarProductos();
      }
    } catch (error) {
      console.error("Error al buscar productos:", error);
    }
  };

  // =======================
  // CRUD funciones
  // =======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (
        formData.tipo_inventario === "preparado" &&
        !formData.producto_preparado_id
      ) {
        alert("Debes seleccionar un producto preparado asociado");
        return;
      }

      const productoData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        categoria: formData.categoria,
        tipo_inventario: formData.tipo_inventario,
        producto_preparado_id:
          formData.tipo_inventario === "preparado"
            ? Number(formData.producto_preparado_id)
            : null,
        receta: formData.tipo_inventario === "general" ? receta : [],
      };

      if (editingProducto) {
        await productoService.actualizar(editingProducto.id, productoData);
      } else {
        await productoService.crear(productoData);
      }

      await cargarProductos();
      closeProductoModal();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert(
        error?.response?.data?.error ||
          error.message ||
          "Error al guardar producto",
      );
    }
  };

  const handleEdit = async (producto) => {
    setError(null);
    setEditingProducto(producto);
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio.toString(),
      categoria: producto.categoria,
      tipo_inventario: producto.tipo_inventario || "general",
      producto_preparado_id: producto.producto_preparado_id || null,
    });

    if ((producto.tipo_inventario || "general") === "general") {
      try {
        const recetaProducto = await productoService.obtenerReceta(producto.id);
        setReceta(
          recetaProducto.map((item) => ({
            ingrediente_id: item.ingrediente_id,
            nombre: item.ingrediente_nombre,
            cantidad: Number(item.cantidad),
            unidad: item.ingrediente_unidad || "",
          })),
        );
      } catch (error) {
        console.error("Error al cargar receta del producto:", error);
        setReceta([]);
        setError(
          error?.response?.data?.error ||
            error?.message ||
            "No se pudo cargar la receta del producto",
        );
      }
    }

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este producto?")) {
      try {
        setError(null);
        await productoService.eliminar(id);
        cargarProductos();
      } catch (error) {
        console.error("Error al eliminar producto:", error);
        setError(
          error?.response?.data?.error ||
            error?.message ||
            "Error al eliminar producto",
        );
      }
    }
  };

  // =======================
  // Helpers visuales
  // =======================
  const getCategoriaIcon = (categoria) => {
    switch (categoria) {
      case "plato":
        return "🍽️";
      case "bebida":
        return "🥤";
      case "postre":
        return "🍰";
      case "entrada":
        return "🥗";
      default:
        return "🍴";
    }
  };

  const getTipoInventarioLabel = (tipo) => {
    return tipo === "preparado" ? "Producto Preparado" : "Plato por preparar";
  };

  const getTipoInventarioClass = (tipo) => {
    return tipo === "preparado" ? "tipo-preparado" : "tipo-general";
  };

  // =======================
  // Render principal
  // =======================
  if (loading) return <div>Cargando...</div>;

  return (
    <div className="productos-container">
      <main className="productos-content">
        <div className="container">
          {error && (
            <div className="productos-error-container">
              <div className="productos-error-message">
                <strong>Error:</strong> {error}
                <button
                  className="productos-error-close"
                  onClick={() => setError(null)}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="productos-header-content">
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingProducto(null);
                setReceta([]);
                setFormData({
                  nombre: "",
                  descripcion: "",
                  precio: "",
                  categoria: "plato",
                  tipo_inventario: "general",
                  producto_preparado_id: null,
                });
                setShowForm(true);
              }}
            >
              Nuevo Producto
            </button>
          </div>

          {showForm && (
            <div className="modal-overlay">
              <div className="modal-content modal-lg">
                <div className="producto-form">
                  <h3 className="producto-form-title">
                    {editingProducto ? "Editar Producto" : "Nuevo Producto"}
                  </h3>

                  <form onSubmit={handleSubmit}>
                    <div className="producto-form-group">
                      <label className="producto-form-label">Nombre</label>
                      <input
                        type="text"
                        className="producto-form-input"
                        value={formData.nombre}
                        onChange={(e) =>
                          setFormData({ ...formData, nombre: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="producto-form-group">
                      <label className="producto-form-label">Descripción</label>
                      <textarea
                        className="producto-form-textarea"
                        value={formData.descripcion}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            descripcion: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="producto-form-group">
                      <label className="producto-form-label">Precio</label>
                      <input
                        type="number"
                        className="producto-form-input"
                        value={formData.precio}
                        onChange={(e) =>
                          setFormData({ ...formData, precio: e.target.value })
                        }
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    <div className="producto-form-group">
                      <label className="producto-form-label">Categoría</label>
                      <select
                        className="producto-form-select"
                        value={formData.categoria}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            categoria: e.target.value,
                          })
                        }
                        required
                      >
                        {categorias
                          .filter((c) => c.value !== "todos")
                          .map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="producto-form-group">
                      <label className="producto-form-label">
                        Tipo de Inventario
                      </label>
                      <select
                        className="producto-form-select"
                        value={formData.tipo_inventario}
                        onChange={(e) => {
                          const nuevoTipo = e.target.value;

                          setFormData({
                            ...formData,
                            tipo_inventario: nuevoTipo,
                            producto_preparado_id:
                              nuevoTipo === "preparado"
                                ? formData.producto_preparado_id
                                : null,
                          });

                          setReceta([]);
                        }}
                        required
                      >
                        {tiposInventario.map((tipo) => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Si elige producto preparado */}
                    {formData.tipo_inventario === "preparado" && (
                      <div className="producto-form-group">
                        <label className="producto-form-label">
                          Seleccionar Producto Preparado
                        </label>
                        <select
                          className="producto-form-select"
                          value={formData.producto_preparado_id || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              producto_preparado_id: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        >
                          <option value="">
                            -- Selecciona un producto preparado --
                          </option>
                          {productosPreparados.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Si elige inventario general (plato por preparar) */}
                    {formData.tipo_inventario === "general" && (
                      <div className="producto-form-group">
                        <label className="producto-form-label">
                          Ingredientes por plato
                        </label>
                        <div className="receta-lista">
                          {receta.map((item, index) => (
                            <div key={index} className="receta-item">
                              <span>{item.nombre}</span>
                              <span>
                                {item.cantidad} {item.unidad || ""}
                              </span>
                              <button
                                type="button"
                                className="producto-form-btn producto-form-btn-delete"
                                onClick={() =>
                                  setReceta(
                                    receta.filter((_, i) => i !== index),
                                  )
                                }
                              >
                                ❌
                              </button>
                            </div>
                          ))}

                          <div className="receta-add">
                            <select
                              id="ingrediente-select"
                              className="producto-form-select"
                            >
                              {ingredientes.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.nombre}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Cantidad por plato"
                              id="ingrediente-cantidad"
                              className="producto-form-input"
                            />
                            <button
                              type="button"
                              className="producto-form-btn producto-form-btn-secondary"
                              onClick={() => {
                                const select =
                                  document.getElementById("ingrediente-select");
                                const cantidadInput = document.getElementById(
                                  "ingrediente-cantidad",
                                );
                                const selected = ingredientes.find(
                                  (i) => i.id == select.value,
                                );
                                if (selected && cantidadInput.value > 0) {
                                  setReceta([
                                    ...receta,
                                    {
                                      ingrediente_id: selected.id,
                                      nombre: selected.nombre,
                                      cantidad: parseFloat(cantidadInput.value),
                                      unidad: selected.unidad || "",
                                    },
                                  ]);
                                  cantidadInput.value = "";
                                }
                              }}
                            >
                              ➕ Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="producto-form-actions">
                      <button
                        type="submit"
                        className="producto-form-btn producto-form-btn-primary"
                      >
                        {editingProducto ? "Actualizar" : "Guardar"}
                      </button>
                      <button
                        type="button"
                        className="producto-form-btn producto-form-btn-secondary"
                        onClick={closeProductoModal}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Filtros y productos */}
          <div className="productos-controls">
            <form className="productos-search" onSubmit={handleSearch}>
              <input
                type="text"
                className="productos-search-input"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>

            <div className="productos-filters">
              {categorias.map((categoria) => (
                <button
                  key={categoria.value}
                  className={`btn ${categoriaFiltro === categoria.value ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setCategoriaFiltro(categoria.value)}
                >
                  {categoria.label}
                </button>
              ))}
            </div>
          </div>

          {filteredProductos.length === 0 ? (
            <div className="productos-empty">
              <div className="productos-empty-icon">📦</div>
              <div className="productos-empty-text">
                No se encontraron productos
              </div>
            </div>
          ) : (
            <div className="productos-grid">
              {filteredProductos.map((producto) => (
                <div key={producto.id} className="producto-card">
                  <div className="producto-imagen">
                    {getCategoriaIcon(producto.categoria)}
                  </div>
                  <h3 className="producto-nombre">{producto.nombre}</h3>
                  <p className="producto-descripcion">{producto.descripcion}</p>
                  <div className="producto-precio">
                    ${parseFloat(producto.precio).toFixed(2)}
                  </div>
                  <div className="producto-categoria">
                    {producto.categoria.charAt(0).toUpperCase() +
                      producto.categoria.slice(1)}
                    <span
                      className={`producto-tipo-inventario ${getTipoInventarioClass(producto.tipo_inventario)}`}
                    >
                      ({getTipoInventarioLabel(producto.tipo_inventario)})
                    </span>
                  </div>
                  <div className="producto-actions">
                    <button
                      className="producto-btn producto-btn-edit"
                      onClick={() => handleEdit(producto)}
                    >
                      Editar
                    </button>
                    <button
                      className="producto-btn producto-btn-delete"
                      onClick={() => handleDelete(producto.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProductosPage;
