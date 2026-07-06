import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { inventarioService } from "../services/inventarioService.js";
import { productosPreparadosService } from "../services/productosPreparadosService.js";

const InventarioPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ingredientes");
  const [ingredientes, setIngredientes] = useState([]);
  const [productosPreparados, setProductosPreparados] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [alertas, setAlertas] = useState({
    ingredientes: [],
    productosPreparados: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchIngredientes, setSearchIngredientes] = useState("");
  const [searchProductosPreparados, setSearchProductosPreparados] =
    useState("");

  // Estados para formularios
  const [showIngredienteForm, setShowIngredienteForm] = useState(false);
  const [showProductoForm, setShowProductoForm] = useState(false);
  const [showRecetaForm, setShowRecetaForm] = useState(false);
  const [showPrepararForm, setShowPrepararForm] = useState(false);
  const [showVenderProductoForm, setShowVenderProductoForm] = useState(false);
  const [showVenderPlatoForm, setShowVenderPlatoForm] = useState(false);

  // Estados para edición
  const [editingIngrediente, setEditingIngrediente] = useState(null);
  const [editingProducto, setEditingProducto] = useState(null);
  const [selectedProducto, setSelectedProducto] = useState(null);

  // Formularios
  const [ingredienteForm, setIngredienteForm] = useState({
    nombre: "",
    unidad: "g",
    stock_actual: "0",
    stock_minimo: "1",
    costo_por_unidad: 0,

    // 🔥 NUEVO
    tipo_ajuste: "aumentar",
    cantidad_ajuste: "",
  });

  const [productoForm, setProductoForm] = useState({
    nombre: "",
    descripcion: "",
    unidad: "unidades",
    stock_actual: "0",
    stock_minimo: "5",
  });

  const [recetaForm, setRecetaForm] = useState({
    ingrediente_id: "",
    cantidad: "",
  });

  const [prepararForm, setPrepararForm] = useState({
    producto_id: "",
    cantidad: 1,
  });

  const [venderProductoForm, setVenderProductoForm] = useState({
    producto_id: "",
    cantidad: 1,
  });

  const [venderPlatoForm, setVenderPlatoForm] = useState({
    ingredientes: [], // Array de { ingrediente_id, cantidad }
  });

  // Estado para la receta del producto preparado
  const [recetaItems, setRecetaItems] = useState([]);

  const esUnidadEntera = (unidad = "") => {
    const unidadNormalizada = String(unidad).toLowerCase();
    return (
      unidadNormalizada === "unidades" || unidadNormalizada === "porciones"
    );
  };

  const normalizarValorNumerico = (rawValue, permitirDecimal) => {
    const valor = String(rawValue).replace(/\s+/g, "").replace(/,/g, ".");

    if (valor === "") {
      return "";
    }

    if (permitirDecimal) {
      const soloNumerosYPunto = valor.replace(/[^\d.]/g, "");
      const [parteEntera = "", ...resto] = soloNumerosYPunto.split(".");

      if (resto.length === 0) {
        return parteEntera;
      }

      return `${parteEntera}.${resto.join("")}`;
    }

    const coincidenciaEntera = valor.match(/^\d*/);
    return coincidenciaEntera ? coincidenciaEntera[0] : "";
  };

  const esCantidadValidaPorUnidad = (valor, unidad) => {
    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero < 0) {
      return false;
    }

    if (esUnidadEntera(unidad) && !Number.isInteger(numero)) {
      return false;
    }

    return true;
  };

  const obtenerIngredientePorId = (ingredienteId) =>
    ingredientes.find((ing) => Number(ing.id) === Number(ingredienteId));

  // Cargar datos iniciales
  useEffect(() => {
    console.log("InventarioPage: Montando componente");
    cargarDatos();
    return () => {
      console.log("InventarioPage: Desmontando componente");
    };
  }, []);

  // Recargar datos cuando cambia la pestaña activa
  useEffect(() => {
    console.log("Cambiando a pestaña:", activeTab);
    if (activeTab === "ingredientes") {
      cargarIngredientes();
    } else if (activeTab === "productos-preparados") {
      cargarProductosPreparados();
    } else if (activeTab === "movimientos") {
      cargarMovimientos();
    }
  }, [activeTab]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Cargando todos los datos...");

      const [ingredientesData, productosData, alertasData, movimientosData] =
        await Promise.all([
          inventarioService.obtenerIngredientes().catch((err) => {
            console.error("Error al cargar ingredientes:", err);
            return [];
          }),
          productosPreparadosService
            .obtenerProductosPreparados()
            .catch((err) => {
              console.error("Error al cargar productos preparados:", err);
              return [];
            }),
          inventarioService.obtenerAlertasStock().catch((err) => {
            console.error("Error al cargar alertas:", err);
            return { ingredientes: [], productosPreparados: [] };
          }),
          inventarioService.obtenerMovimientos().catch((err) => {
            console.error("Error al cargar movimientos:", err);
            return [];
          }),
        ]);

      setIngredientes(ingredientesData);
      setProductosPreparados(productosData);
      setAlertas(alertasData);
      setMovimientos(movimientosData);

      console.log("Datos cargados exitosamente");
    } catch (err) {
      console.error("Error general al cargar datos:", err);
      setError(err.message || "Error al cargar los datos del inventario");
    } finally {
      setLoading(false);
    }
  };

  const cargarIngredientes = async () => {
    try {
      console.log("Cargando ingredientes...");
      const data = await inventarioService.obtenerIngredientes();
      setIngredientes(data);
      console.log("Ingredientes cargados:", data);
    } catch (err) {
      console.error("Error al cargar ingredientes:", err);
      setError(
        "Error al cargar ingredientes: " +
          (err.response?.data?.error || err.message),
      );
    }
  };
  const cargarProductosPreparados = async () => {
    try {
      console.log("Cargando productos preparados...");
      const data =
        await productosPreparadosService.obtenerProductosPreparados();

      // Cargar recetas para cada producto
      const productosConReceta = await Promise.all(
        data.map(async (producto) => {
          try {
            const receta = await productosPreparadosService.obtenerReceta(
              producto.id,
            );
            return { ...producto, receta };
          } catch (error) {
            console.error(
              `Error al cargar receta del producto ${producto.id}:`,
              error,
            );
            // Si hay un error, continuamos con receta vacía
            return { ...producto, receta: [] };
          }
        }),
      );

      setProductosPreparados(productosConReceta);
      console.log(
        "Productos preparados con recetas cargados:",
        productosConReceta,
      );
    } catch (err) {
      console.error("Error al cargar productos preparados:", err);
      setError(
        "Error al cargar productos preparados: " +
          (err.response?.data?.error || err.message),
      );
    }
  };

  const cargarAlertas = async () => {
    try {
      console.log("Cargando alertas...");
      const data = await inventarioService.obtenerAlertasStock();
      setAlertas(data);
      console.log("Alertas cargadas:", data);
    } catch (err) {
      console.error("Error al cargar alertas:", err);
    }
  };

  const cargarMovimientos = async () => {
    try {
      console.log("Cargando movimientos...");
      const data = await inventarioService.obtenerMovimientos();
      setMovimientos(data);
      console.log("Movimientos cargados:", data);
    } catch (err) {
      console.error("Error al cargar movimientos:", err);
    }
  };

  // Funciones para ingredientes
  const handleSubmitIngrediente = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // 🔥 SI ESTAMOS EDITANDO
      if (editingIngrediente) {
        if (
          !esCantidadValidaPorUnidad(
            ingredienteForm.stock_minimo,
            ingredienteForm.unidad,
          )
        ) {
          throw new Error(
            "El stock mínimo no cumple el formato permitido para la unidad seleccionada",
          );
        }

        const cantidad = Number(ingredienteForm.cantidad_ajuste || 0);

        if (!Number.isFinite(cantidad) || cantidad < 0) {
          throw new Error("Cantidad inválida");
        }

        if (cantidad > 10000) {
          throw new Error("Cantidad demasiado alta");
        }

        if (
          esUnidadEntera(ingredienteForm.unidad) &&
          !Number.isInteger(cantidad)
        ) {
          throw new Error(
            "Para unidad o porciones, la cantidad de ajuste debe ser entera",
          );
        }

        let ajuste = cantidad;

        if (ingredienteForm.tipo_ajuste === "disminuir") {
          ajuste = -cantidad;
        }

        const dataToSend = {
          nombre: ingredienteForm.nombre,
          unidad: ingredienteForm.unidad,
          stock_minimo: Number(ingredienteForm.stock_minimo),
          ajuste,
        };

        await inventarioService.actualizarIngrediente(
          editingIngrediente.id,
          dataToSend,
        );

        setEditingIngrediente(null);
      } else {
        // 🔥 CREAR NORMAL
        if (
          !esCantidadValidaPorUnidad(
            ingredienteForm.stock_actual,
            ingredienteForm.unidad,
          )
        ) {
          throw new Error(
            "El stock actual no cumple el formato permitido para la unidad seleccionada",
          );
        }

        if (
          !esCantidadValidaPorUnidad(
            ingredienteForm.stock_minimo,
            ingredienteForm.unidad,
          )
        ) {
          throw new Error(
            "El stock mínimo no cumple el formato permitido para la unidad seleccionada",
          );
        }

        await inventarioService.crearIngrediente({
          ...ingredienteForm,
          stock_actual: Number(ingredienteForm.stock_actual),
          stock_minimo: Number(ingredienteForm.stock_minimo),
        });
      }

      resetIngredienteForm();
      await cargarIngredientes();
      await cargarAlertas();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIngrediente = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este ingrediente?")) {
      try {
        setLoading(true);
        await inventarioService.eliminarIngrediente(id);
        await cargarIngredientes();
        await cargarAlertas();
      } catch (error) {
        // 🔥 mostrar mensaje del backend
        setError(error.message || "No se pudo eliminar el ingrediente");
      } finally {
        setLoading(false);
      }
    }
  };

  // Funciones para productos preparados
  const handleSubmitProducto = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (
        editingProducto &&
        !esCantidadValidaPorUnidad(
          productoForm.stock_actual,
          productoForm.unidad,
        )
      ) {
        throw new Error(
          "El stock actual no cumple el formato permitido para la unidad seleccionada",
        );
      }

      if (
        !esCantidadValidaPorUnidad(
          productoForm.stock_minimo,
          productoForm.unidad,
        )
      ) {
        throw new Error(
          "El stock mínimo no cumple el formato permitido para la unidad seleccionada",
        );
      }

      const ingredientesNormalizados = recetaItems.map((item) => {
        const ingredienteSeleccionado = obtenerIngredientePorId(
          item.ingrediente_id,
        );

        if (!ingredienteSeleccionado) {
          throw new Error(
            "Cada item de receta debe tener un ingrediente válido",
          );
        }

        const cantidad = Number(item.cantidad);

        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error(
            `Cantidad inválida para ${ingredienteSeleccionado.nombre}`,
          );
        }

        if (
          esUnidadEntera(ingredienteSeleccionado.unidad) &&
          !Number.isInteger(cantidad)
        ) {
          throw new Error(
            `La cantidad de ${ingredienteSeleccionado.nombre} debe ser entera por su unidad`,
          );
        }

        return {
          ingrediente_id: parseInt(item.ingrediente_id),
          cantidad,
        };
      });

      const productoData = {
        ...productoForm,
        stock_actual: editingProducto ? Number(productoForm.stock_actual) : 0,
        stock_minimo: Number(productoForm.stock_minimo),
        ingredientes: ingredientesNormalizados,
      };

      console.log("📦 Enviando producto preparado:", productoData);

      if (editingProducto) {
        await productosPreparadosService.actualizarProductoPreparado(
          editingProducto.id,
          productoData,
        );
        alert("✅ Producto preparado actualizado correctamente");
      } else {
        await productosPreparadosService.crearProductoPreparado(productoData);
        alert("✅ Producto preparado creado correctamente");
      }

      resetProductoForm();
      await cargarProductosPreparados();
      await cargarAlertas();
      await cargarMovimientos();
    } catch (err) {
      console.error("❌ Error al guardar producto:", err);
      setError(
        "Error al guardar producto: " +
          (err.response?.data?.error || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProducto = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este producto preparado?")) {
      try {
        setLoading(true);
        await productosPreparadosService.eliminarProductoPreparado(id);
        await cargarProductosPreparados();
        await cargarAlertas();
        await cargarMovimientos();
      } catch (error) {
        console.error("Error al eliminar producto:", error);
        setError(
          "Error al eliminar producto: " +
            (error.response?.data?.error || error.message),
        );
      } finally {
        setLoading(false);
      }
    }
  };

  // Funciones para recetas
  const agregarIngredienteAReceta = () => {
    setRecetaItems([...recetaItems, { ingrediente_id: "", cantidad: "" }]);
  };

  const actualizarIngredienteReceta = (index, campo, valor) => {
    const nuevosItems = [...recetaItems];
    nuevosItems[index] = {
      ...nuevosItems[index],
      [campo]: valor,
    };
    setRecetaItems(nuevosItems);
  };

  const eliminarIngredienteReceta = (index) => {
    const nuevosItems = recetaItems.filter((_, i) => i !== index);
    setRecetaItems(nuevosItems);
  };

  const cargarRecetaProducto = async (productoId) => {
    try {
      console.log(`🔍 Cargando receta para producto: ${productoId}`);
      const receta = await productosPreparadosService.obtenerReceta(productoId);
      console.log(`✅ Receta cargada:`, receta);
      setRecetaItems(
        receta.map((item) => ({
          ingrediente_id: item.ingrediente_id,
          cantidad: String(item.cantidad ?? ""),
          ingrediente_unidad: item.ingrediente_unidad,
        })),
      );
    } catch (error) {
      console.error(
        `❌ Error al cargar receta del producto ${productoId}:`,
        error,
      );
      // Si es un error 404, simplemente dejamos la receta vacía
      if (error.response && error.response.status === 404) {
        console.log(`⚠️ Receta no encontrada, dejando vacía`);
        setRecetaItems([]);
      } else {
        // Para otros errores, también dejamos la receta vacía pero mostramos un mensaje
        console.error("Error al cargar receta:", error.message);
        setRecetaItems([]);
      }
    }
  };

  const handleEditProducto = async (producto) => {
    setEditingProducto(producto);
    setProductoForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      unidad: producto.unidad,
      stock_actual: String(producto.stock_actual ?? ""),
      stock_minimo: String(producto.stock_minimo ?? ""),
    });

    // Cargar receta del producto
    await cargarRecetaProducto(producto.id);

    setShowProductoForm(true);
  };

  // Función para preparar producto (CORREGIDA)
  // Función para preparar producto (CORREGIDA)
  // En InventarioPage.jsx
  const handlePrepararProducto = async (productoId, cantidad) => {
    try {
      console.log("🟢 Preparando producto:", productoId, cantidad);
      const response = await inventarioService.prepararProducto({
        productoId,
        cantidad,
      });
      console.log("✅ Respuesta del backend:", response);

      alert(response.message || "Producto preparado correctamente");
      await cargarDatos(); // Recargar todos los datos
    } catch (error) {
      console.error("❌ Error al preparar producto:", error);
      alert(error.response?.data?.error || "Error al preparar producto");
    }
  };

  // Funciones de utilidad
  const resetIngredienteForm = () => {
    setIngredienteForm({
      nombre: "",
      unidad: "g",
      stock_actual: "0",
      stock_minimo: "1",
      costo_por_unidad: 0,
      tipo_ajuste: "aumentar",
      cantidad_ajuste: "",
    });
    setShowIngredienteForm(false);
    setEditingIngrediente(null);
  };

  const resetProductoForm = () => {
    setProductoForm({
      nombre: "",
      descripcion: "",
      unidad: "unidades",
      stock_actual: "0",
      stock_minimo: "5",
      costo_por_unidad: 0,
    });
    setRecetaItems([]);
    setShowProductoForm(false);
    setEditingProducto(null);
  };

  const resetRecetaForm = () => {
    setRecetaForm({
      ingrediente_id: "",
      cantidad: "",
    });
    setShowRecetaForm(false);
  };

  const resetPrepararForm = () => {
    setPrepararForm({
      producto_id: "",
      cantidad: 1,
    });
    setShowPrepararForm(false);
  };

  const resetVenderProductoForm = () => {
    setVenderProductoForm({
      producto_id: "",
      cantidad: 1,
    });
    setShowVenderProductoForm(false);
  };

  const resetVenderPlatoForm = () => {
    setVenderPlatoForm({
      ingredientes: [],
    });
    setShowVenderPlatoForm(false);
  };

  const getStockStatus = (stock, minimo) => {
    if (stock <= 0) return "critico";
    if (stock <= minimo) return "bajo";
    return "normal";
  };

  const getStockClass = (status) => {
    switch (status) {
      case "bajo":
        return "stock-bajo";
      case "critico":
        return "stock-critico";
      default:
        return "";
    }
  };

  const getStockBadge = (status) => {
    switch (status) {
      case "bajo":
        return <span className="badge badge-warning">Stock Bajo</span>;
      case "critico":
        return <span className="badge badge-danger">Sin Stock</span>;
      default:
        return <span className="badge badge-success">Stock Normal</span>;
    }
  };

  const normalizarTexto = (valor) =>
    String(valor ?? "")
      .toLowerCase()
      .trim();

  const ingredientesFiltrados = ingredientes.filter((ingrediente) => {
    const textoBusqueda = normalizarTexto(searchIngredientes);
    if (!textoBusqueda) return true;

    return [ingrediente.nombre, ingrediente.unidad].some((campo) =>
      normalizarTexto(campo).includes(textoBusqueda),
    );
  });

  const productosPreparadosFiltrados = productosPreparados.filter(
    (producto) => {
      const textoBusqueda = normalizarTexto(searchProductosPreparados);
      if (!textoBusqueda) return true;

      const coincideProducto = [
        producto.nombre,
        producto.descripcion,
        producto.unidad,
      ].some((campo) => normalizarTexto(campo).includes(textoBusqueda));

      const coincideIngredienteReceta =
        Array.isArray(producto.receta) &&
        producto.receta.some((item) =>
          normalizarTexto(item.ingrediente_nombre).includes(textoBusqueda),
        );

      return coincideProducto || coincideIngredienteReceta;
    },
  );

  if (loading && !showIngredienteForm && !showProductoForm) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="inventario-container">
      {/* Mostrar errores si existen */}
      {error && (
        <div className="error-container">
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button className="close-error" onClick={() => setError(null)}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="inventario-header">
        <div className="inventario-header-content">
          <div>
            <h1 className="inventario-title">Control de Inventario</h1>
            {loading && (
              <span className="loading-indicator">Procesando...</span>
            )}
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowIngredienteForm(true)}
              disabled={loading}
            >
              Nuevo Ingrediente
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowProductoForm(true)}
              disabled={loading}
            >
              Nuevo Producto Preparado
            </button>
          </div>
        </div>
      </header>

      {/* Alertas de stock */}
      {(alertas.ingredientes.length > 0 ||
        alertas.productosPreparados.length > 0) && (
        <div className="stock-alertas">
          <h3 className="stock-alertas-title">Alertas de Stock Bajo</h3>
          <div className="stock-alertas-grid">
            {alertas.ingredientes.map((item) => (
              <div
                key={`ing-${item.id}`}
                className={`stock-alerta-card ${getStockClass(getStockStatus(item.stock_actual, item.stock_minimo))}`}
              >
                <div className="stock-alerta-header">
                  <span className="stock-alerta-nombre">{item.nombre}</span>
                  <span className="stock-alerta-cantidad">
                    {item.stock_actual} {item.unidad}
                  </span>
                </div>
                <div className="stock-alerta-info">
                  <span>
                    Mínimo: {item.stock_minimo} {item.unidad}
                  </span>
                  <span>
                    Faltan: {Math.max(0, item.stock_minimo - item.stock_actual)}{" "}
                    {item.unidad}
                  </span>
                </div>
              </div>
            ))}
            {alertas.productosPreparados.map((item) => (
              <div
                key={`prod-${item.id}`}
                className={`stock-alerta-card ${getStockClass(getStockStatus(item.stock_actual, item.stock_minimo))}`}
              >
                <div className="stock-alerta-header">
                  <span className="stock-alerta-nombre">{item.nombre}</span>
                  <span className="stock-alerta-cantidad">
                    {item.stock_actual} {item.unidad}
                  </span>
                </div>
                <div className="stock-alerta-info">
                  <span>
                    Mínimo: {item.stock_minimo} {item.unidad}
                  </span>
                  <span>
                    Faltan: {Math.max(0, item.stock_minimo - item.stock_actual)}{" "}
                    {item.unidad}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pestañas */}
      <div className="inventario-tabs">
        <button
          className={`inventario-tab ${activeTab === "ingredientes" ? "active" : ""}`}
          onClick={() => setActiveTab("ingredientes")}
          disabled={loading}
        >
          Ingredientes
        </button>
        <button
          className={`inventario-tab ${activeTab === "productos-preparados" ? "active" : ""}`}
          onClick={() => setActiveTab("productos-preparados")}
          disabled={loading}
        >
          Productos Preparados
        </button>
        <button
          className={`inventario-tab ${activeTab === "movimientos" ? "active" : ""}`}
          onClick={() => setActiveTab("movimientos")}
          disabled={loading}
        >
          Movimientos
        </button>
      </div>

      {/* Contenido de la pestaña activa */}
      <main className="inventario-content">
        <div className="container">
          {/* Formulario de ingrediente */}
          {showIngredienteForm && (
            <div className="modal-overlay" onClick={resetIngredienteForm}>
              <div
                className="modal-content modal-lg inventario-modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="inventario-modal-close"
                  onClick={resetIngredienteForm}
                  disabled={loading}
                  aria-label="Cerrar formulario de ingrediente"
                >
                  ×
                </button>
                <div className="ingrediente-form">
                  <h3 className="ingrediente-form-title">
                    {editingIngrediente
                      ? "Editar Ingrediente"
                      : "Nuevo Ingrediente"}
                  </h3>
                  <form onSubmit={handleSubmitIngrediente}>
                    <div className="ingrediente-form-grid">
                      {/* NOMBRE */}
                      <div className="ingrediente-form-group">
                        <label className="ingrediente-form-label">Nombre</label>
                        <input
                          type="text"
                          className="ingrediente-form-input"
                          value={ingredienteForm.nombre}
                          onChange={(e) => {
                            let val = e.target.value;
                            val = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");

                            setIngredienteForm({
                              ...ingredienteForm,
                              nombre: val,
                            });
                          }}
                          required
                          disabled={loading}
                        />
                      </div>

                      {/* UNIDAD */}
                      <div className="ingrediente-form-group">
                        <label className="ingrediente-form-label">Unidad</label>
                        <select
                          className="ingrediente-form-select"
                          value={ingredienteForm.unidad}
                          onChange={(e) =>
                            setIngredienteForm({
                              ...ingredienteForm,
                              unidad: e.target.value,
                            })
                          }
                          disabled={loading}
                        >
                          <option value="g">Gramos (g)</option>
                          <option value="kg">Kilogramos (kg)</option>
                          <option value="L">Litros (L)</option>
                          <option value="ml">Mililitros (ml)</option>
                          <option value="unidades">Unidades</option>
                        </select>
                      </div>

                      {/* STOCK ACTUAL (BLOQUEADO) */}
                      <div className="ingrediente-form-group">
                        <label className="ingrediente-form-label">
                          Stock Actual
                        </label>
                        <input
                          type="text"
                          className="ingrediente-form-input"
                          value={ingredienteForm.stock_actual}
                          onChange={(e) => {
                            const valorNormalizado = normalizarValorNumerico(
                              e.target.value,
                              !esUnidadEntera(ingredienteForm.unidad),
                            );

                            if (valorNormalizado === null) return;

                            setIngredienteForm({
                              ...ingredienteForm,
                              stock_actual: valorNormalizado,
                            });
                          }}
                          inputMode={
                            esUnidadEntera(ingredienteForm.unidad)
                              ? "numeric"
                              : "decimal"
                          }
                          disabled={!!editingIngrediente}
                        />
                      </div>

                      {/* AJUSTE SOLO SI EDITAS */}
                      {editingIngrediente && (
                        <>
                          <div className="ingrediente-form-group">
                            <label className="ingrediente-form-label">
                              Tipo de ajuste
                            </label>
                            <select
                              className="ingrediente-form-select"
                              value={ingredienteForm.tipo_ajuste || "aumentar"}
                              onChange={(e) =>
                                setIngredienteForm({
                                  ...ingredienteForm,
                                  tipo_ajuste: e.target.value,
                                })
                              }
                            >
                              <option value="aumentar">Aumentar stock</option>
                              <option value="disminuir">Disminuir stock</option>
                            </select>
                          </div>

                          <div className="ingrediente-form-group">
                            <label className="ingrediente-form-label">
                              Cantidad
                            </label>
                            <input
                              type="text"
                              className="ingrediente-form-input"
                              value={ingredienteForm.cantidad_ajuste || ""}
                              onChange={(e) => {
                                const valorNormalizado =
                                  normalizarValorNumerico(
                                    e.target.value,
                                    !esUnidadEntera(ingredienteForm.unidad),
                                  );

                                if (valorNormalizado === null) return;

                                setIngredienteForm({
                                  ...ingredienteForm,
                                  cantidad_ajuste: valorNormalizado,
                                });
                              }}
                              inputMode={
                                esUnidadEntera(ingredienteForm.unidad)
                                  ? "numeric"
                                  : "decimal"
                              }
                              placeholder="Ej: 10"
                            />
                          </div>
                        </>
                      )}

                      {/* STOCK MINIMO */}
                      <div className="ingrediente-form-group">
                        <label className="ingrediente-form-label">
                          Stock Mínimo
                        </label>
                        <input
                          type="text"
                          className="ingrediente-form-input"
                          value={ingredienteForm.stock_minimo}
                          onChange={(e) => {
                            const valorNormalizado = normalizarValorNumerico(
                              e.target.value,
                              !esUnidadEntera(ingredienteForm.unidad),
                            );

                            if (valorNormalizado === null) return;

                            setIngredienteForm({
                              ...ingredienteForm,
                              stock_minimo: valorNormalizado,
                            });
                          }}
                          inputMode={
                            esUnidadEntera(ingredienteForm.unidad)
                              ? "numeric"
                              : "decimal"
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="ingrediente-form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading
                          ? "Guardando..."
                          : editingIngrediente
                            ? "Actualizar"
                            : "Guardar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={resetIngredienteForm}
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Formulario de producto preparado con receta */}
          {showProductoForm && (
            <div className="modal-overlay" onClick={resetProductoForm}>
              <div
                className="modal-content modal-lg inventario-modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="inventario-modal-close"
                  onClick={resetProductoForm}
                  disabled={loading}
                  aria-label="Cerrar formulario de producto preparado"
                >
                  ×
                </button>
                <div className="ingrediente-form">
                  <h3 className="ingrediente-form-title">
                    {editingProducto
                      ? "Editar Producto Preparado"
                      : "Nuevo Producto Preparado"}
                  </h3>
                  <form onSubmit={handleSubmitProducto}>
                    {/* Campos del producto */}
                    <div className="ingrediente-form-grid">
                      <div className="ingrediente-form-group">
                        <label className="ingrediente-form-label">Nombre</label>
                        <input
                          type="text"
                          className="ingrediente-form-input"
                          value={productoForm.nombre}
                          onChange={(e) =>
                            setProductoForm({
                              ...productoForm,
                              nombre: e.target.value,
                            })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="ingrediente-form-group">
                        <label className="ingrediente-form-label">
                          Descripción
                        </label>
                        <textarea
                          className="ingrediente-form-input"
                          value={productoForm.descripcion}
                          onChange={(e) =>
                            setProductoForm({
                              ...productoForm,
                              descripcion: e.target.value,
                            })
                          }
                          disabled={loading}
                        />
                      </div>
                      <div className="ingrediente-form-group">
                        <label className="ingrediente-form-label">Unidad</label>
                        <select
                          className="ingrediente-form-select"
                          value={productoForm.unidad}
                          onChange={(e) =>
                            setProductoForm({
                              ...productoForm,
                              unidad: e.target.value,
                            })
                          }
                          disabled={loading}
                        >
                          <option value="unidades">Unidades</option>
                          <option value="porciones">Porciones</option>
                          <option value="litros">Litros</option>
                          <option value="kg">Kg</option>
                        </select>
                      </div>
                      {editingProducto && (
                        <div className="ingrediente-form-group">
                          <label className="ingrediente-form-label">
                            Stock Actual
                          </label>
                          <input
                            type="text"
                            className="ingrediente-form-input"
                            value={productoForm.stock_actual}
                            onChange={(e) => {
                              const valorNormalizado = normalizarValorNumerico(
                                e.target.value,
                                !esUnidadEntera(productoForm.unidad),
                              );

                              if (valorNormalizado === null) return;

                              setProductoForm({
                                ...productoForm,
                                stock_actual: valorNormalizado,
                              });
                            }}
                            inputMode={
                              esUnidadEntera(productoForm.unidad)
                                ? "numeric"
                                : "decimal"
                            }
                            required
                            disabled={loading}
                          />
                        </div>
                      )}
                      <div className="ingrediente-form-group">
                        <label className="ingrediente-form-label">
                          Stock Mínimo
                        </label>
                        <input
                          type="text"
                          className="ingrediente-form-input"
                          value={productoForm.stock_minimo}
                          onChange={(e) => {
                            const valorNormalizado = normalizarValorNumerico(
                              e.target.value,
                              !esUnidadEntera(productoForm.unidad),
                            );

                            if (valorNormalizado === null) return;

                            setProductoForm({
                              ...productoForm,
                              stock_minimo: valorNormalizado,
                            });
                          }}
                          inputMode={
                            esUnidadEntera(productoForm.unidad)
                              ? "numeric"
                              : "decimal"
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Sección de receta */}
                    <div className="receta-section">
                      <h4 className="receta-title">Receta del Producto</h4>
                      <p className="receta-description">
                        Agrega los ingredientes necesarios para preparar este
                        producto
                      </p>

                      {recetaItems.map((item, index) => (
                        <div key={index} className="receta-item">
                          <div className="receta-item-grid">
                            {(() => {
                              const ingredienteSeleccionado =
                                obtenerIngredientePorId(item.ingrediente_id);
                              const unidadIngrediente =
                                ingredienteSeleccionado?.unidad ||
                                item.ingrediente_unidad ||
                                "";
                              const permiteDecimal =
                                !esUnidadEntera(unidadIngrediente);

                              return (
                                <>
                                  <div className="receta-item-group">
                                    <label className="receta-item-label">
                                      Ingrediente
                                    </label>
                                    <select
                                      className="receta-item-select"
                                      value={item.ingrediente_id}
                                      onChange={(e) =>
                                        actualizarIngredienteReceta(
                                          index,
                                          "ingrediente_id",
                                          e.target.value,
                                        )
                                      }
                                      required
                                      disabled={loading}
                                    >
                                      <option value="">
                                        Seleccionar ingrediente
                                      </option>
                                      {ingredientes.map((ingrediente) => (
                                        <option
                                          key={ingrediente.id}
                                          value={ingrediente.id}
                                        >
                                          {ingrediente.nombre} (
                                          {ingrediente.unidad})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="receta-item-group">
                                    <label className="receta-item-label">
                                      Cantidad
                                    </label>
                                    <input
                                      type="text"
                                      className="receta-item-input"
                                      value={item.cantidad}
                                      onChange={(e) => {
                                        const valorNormalizado =
                                          normalizarValorNumerico(
                                            e.target.value,
                                            permiteDecimal,
                                          );

                                        if (valorNormalizado === null) return;

                                        actualizarIngredienteReceta(
                                          index,
                                          "cantidad",
                                          valorNormalizado,
                                        );
                                      }}
                                      inputMode={
                                        permiteDecimal ? "decimal" : "numeric"
                                      }
                                      required
                                      disabled={loading}
                                    />
                                  </div>
                                  <div className="receta-item-group">
                                    <label className="receta-item-label">
                                      Acción
                                    </label>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      onClick={() =>
                                        eliminarIngredienteReceta(index)
                                      }
                                      disabled={loading}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))}

                      <div className="receta-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={agregarIngredienteAReceta}
                          disabled={loading}
                        >
                          Agregar Ingrediente
                        </button>
                      </div>
                    </div>

                    <div className="ingrediente-form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading
                          ? "Guardando..."
                          : editingProducto
                            ? "Actualizar"
                            : "Guardar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={resetProductoForm}
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Contenido de la pestaña activa */}
          {activeTab === "ingredientes" && (
            <>
              <div className="inventario-search-container">
                <input
                  type="text"
                  className="inventario-search-input"
                  placeholder="Buscar ingrediente por nombre o unidad..."
                  value={searchIngredientes}
                  onChange={(e) => setSearchIngredientes(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="inventario-grid">
                {ingredientes.length === 0 ? (
                  <div className="empty-state">
                    <p>No hay ingredientes registrados</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowIngredienteForm(true)}
                    >
                      Agregar Ingrediente
                    </button>
                  </div>
                ) : ingredientesFiltrados.length === 0 ? (
                  <div className="empty-state">
                    <p>No se encontraron ingredientes con ese texto</p>
                  </div>
                ) : (
                  ingredientesFiltrados.map((ingrediente) => (
                    <div
                      key={ingrediente.id}
                      className={`ingrediente-card ${getStockClass(getStockStatus(ingrediente.stock_actual, ingrediente.stock_minimo))}`}
                    >
                      <div className="ingrediente-header">
                        <h3 className="ingrediente-nombre">
                          {ingrediente.nombre}
                        </h3>
                        <div className="ingrediente-acciones">
                          <button
                            className="btn btn-icon"
                            onClick={() => {
                              setEditingIngrediente(ingrediente);
                              setIngredienteForm({
                                ...ingrediente,
                                stock_actual: String(
                                  ingrediente.stock_actual ?? "",
                                ),
                                stock_minimo: String(
                                  ingrediente.stock_minimo ?? "",
                                ),
                                tipo_ajuste: "aumentar",
                                cantidad_ajuste: "",
                              });
                              setShowIngredienteForm(true);
                            }}
                            title="Editar"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-icon"
                            onClick={() =>
                              handleDeleteIngrediente(ingrediente.id)
                            }
                            title="Eliminar"
                            disabled={loading}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="ingrediente-info">
                        <div className="ingrediente-info-item">
                          <span className="ingrediente-info-label">
                            Unidad:
                          </span>
                          <span className="ingrediente-info-value">
                            {ingrediente.unidad}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`ingrediente-stock ${getStockClass(getStockStatus(ingrediente.stock_actual, ingrediente.stock_minimo))}`}
                      >
                        <span className="ingrediente-stock-actual">
                          {ingrediente.stock_actual} {ingrediente.unidad}
                        </span>
                        <span className="ingrediente-stock-minimo">
                          Mín: {ingrediente.stock_minimo} {ingrediente.unidad}
                        </span>
                      </div>
                      <div className="ingrediente-status">
                        {getStockBadge(
                          getStockStatus(
                            ingrediente.stock_actual,
                            ingrediente.stock_minimo,
                          ),
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "productos-preparados" && (
            <>
              <div className="inventario-search-container">
                <input
                  type="text"
                  className="inventario-search-input"
                  placeholder="Buscar producto preparado, descripcion o ingrediente..."
                  value={searchProductosPreparados}
                  onChange={(e) => setSearchProductosPreparados(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="inventario-grid">
                {productosPreparados.length === 0 ? (
                  <div className="empty-state">
                    <p>No hay productos preparados registrados</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowProductoForm(true)}
                    >
                      Agregar Producto Preparado
                    </button>
                  </div>
                ) : productosPreparadosFiltrados.length === 0 ? (
                  <div className="empty-state">
                    <p>No se encontraron productos preparados con ese texto</p>
                  </div>
                ) : (
                  productosPreparadosFiltrados.map((producto) => (
                    <div
                      key={producto.id}
                      className={`ingrediente-card ${getStockClass(getStockStatus(producto.stock_actual, producto.stock_minimo))}`}
                    >
                      <div className="ingrediente-header">
                        <h3 className="ingrediente-nombre">
                          {producto.nombre}
                        </h3>
                        <div className="ingrediente-acciones">
                          <button
                            className="btn btn-icon"
                            onClick={() => handleEditProducto(producto)}
                            title="Editar"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-icon"
                            onClick={() => handleDeleteProducto(producto.id)}
                            title="Eliminar"
                            disabled={loading}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="ingrediente-info">
                        <div className="ingrediente-info-item">
                          <span className="ingrediente-info-label">Tipo:</span>
                          <span className="ingrediente-info-value">
                            Preparado
                          </span>
                        </div>
                        <div className="ingrediente-info-item">
                          <span className="ingrediente-info-label">
                            Unidad:
                          </span>
                          <span className="ingrediente-info-value">
                            {producto.unidad}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`ingrediente-stock ${getStockClass(getStockStatus(producto.stock_actual, producto.stock_minimo))}`}
                      >
                        <span className="ingrediente-stock-actual">
                          {producto.stock_actual} {producto.unidad}
                        </span>
                        <span className="ingrediente-stock-minimo">
                          Mín: {producto.stock_minimo} {producto.unidad}
                        </span>
                      </div>
                      <div className="ingrediente-status">
                        {getStockBadge(
                          getStockStatus(
                            producto.stock_actual,
                            producto.stock_minimo,
                          ),
                        )}
                      </div>

                      {/* Mostrar receta del producto */}
                      <div className="producto-receta">
                        <h5>📝 Receta:</h5>
                        {producto.receta && producto.receta.length > 0 ? (
                          <ul className="receta-list">
                            {producto.receta.map((item, index) => (
                              <li key={index}>
                                • {item.ingrediente_nombre}: {item.cantidad}{" "}
                                {item.ingrediente_unidad}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-receta">⚠️ No hay receta definida</p>
                        )}
                      </div>

                      <div className="producto-acciones">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            const cantidadInput = prompt(
                              `¿Qué stock final deseas establecer para ${producto.nombre} (${producto.unidad})?`,
                              String(producto.stock_actual ?? "1"),
                            );

                            if (cantidadInput == null) return;

                            const cantidadNormalizada = Number(
                              String(cantidadInput).replace(",", "."),
                            );

                            if (
                              !Number.isFinite(cantidadNormalizada) ||
                              cantidadNormalizada <= 0
                            ) {
                              alert(
                                "Ingresa un stock final válido mayor que 0",
                              );
                              return;
                            }

                            if (
                              esUnidadEntera(producto.unidad) &&
                              !Number.isInteger(cantidadNormalizada)
                            ) {
                              alert(
                                "Para unidades o porciones, la cantidad debe ser entera",
                              );
                              return;
                            }

                            handlePrepararProducto(
                              producto.id,
                              cantidadNormalizada,
                            );
                          }}
                          disabled={loading}
                        >
                          Preparar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "movimientos" && (
            <div className="movimientos-container">
              {movimientos.length === 0 ? (
                <div className="empty-state">
                  <p>No hay movimientos registrados</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="movimientos-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo Inventario</th>
                        <th>Item</th>
                        <th>Tipo Movimiento</th>
                        <th>Cantidad</th>
                        <th>Motivo</th>
                        <th>Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((movimiento) => (
                        <tr key={movimiento.id}>
                          <td>
                            {new Date(
                              movimiento.fecha_creacion,
                            ).toLocaleDateString()}
                          </td>
                          <td>
                            <span
                              className={`movimiento-badge ${movimiento.tipo_inventario}`}
                            >
                              {movimiento.tipo_inventario === "ingrediente"
                                ? "Ingrediente"
                                : "Producto Preparado"}
                            </span>
                          </td>
                          <td>{movimiento.item_nombre}</td>
                          <td>
                            <span
                              className={`movimiento-badge ${movimiento.tipo}`}
                            >
                              {movimiento.tipo}
                            </span>
                          </td>
                          <td>{movimiento.cantidad}</td>
                          <td>{movimiento.motivo}</td>
                          <td>{movimiento.usuario_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InventarioPage;
