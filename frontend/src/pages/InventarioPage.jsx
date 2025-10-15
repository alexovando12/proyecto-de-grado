import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { inventarioService } from '../services/inventarioService.js';
import { productosPreparadosService } from '../services/productosPreparadosService.js';

const InventarioPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('ingredientes');
    const [ingredientes, setIngredientes] = useState([]);
    const [productosPreparados, setProductosPreparados] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [alertas, setAlertas] = useState({ ingredientes: [], productosPreparados: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
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
        nombre: '',
        unidad: 'g',
        stock_actual: 0,
        stock_minimo: 1,
        costo_por_unidad: 0
    });
    
const [productoForm, setProductoForm] = useState({
    nombre: '',
    descripcion: '',
    unidad: 'unidades',
    stock_actual: 0,
    stock_minimo: 5
});

    
    const [recetaForm, setRecetaForm] = useState({
        ingrediente_id: '',
        cantidad: 0
    });
    
    const [prepararForm, setPrepararForm] = useState({
        producto_id: '',
        cantidad: 1
    });
    
    const [venderProductoForm, setVenderProductoForm] = useState({
        producto_id: '',
        cantidad: 1
    });
    
    const [venderPlatoForm, setVenderPlatoForm] = useState({
        ingredientes: [] // Array de { ingrediente_id, cantidad }
    });

    // Estado para la receta del producto preparado
    const [recetaItems, setRecetaItems] = useState([]);

    // Cargar datos iniciales
    useEffect(() => {
        console.log('InventarioPage: Montando componente');
        cargarDatos();
        return () => {
            console.log('InventarioPage: Desmontando componente');
        };
    }, []);

    // Recargar datos cuando cambia la pestaña activa
    useEffect(() => {
        console.log('Cambiando a pestaña:', activeTab);
        if (activeTab === 'ingredientes') {
            cargarIngredientes();
        } else if (activeTab === 'productos-preparados') {
            cargarProductosPreparados();
        } else if (activeTab === 'movimientos') {
            cargarMovimientos();
        }
    }, [activeTab]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Cargando todos los datos...');
            
            const [ingredientesData, productosData, alertasData, movimientosData] = await Promise.all([
                inventarioService.obtenerIngredientes().catch(err => {
                    console.error('Error al cargar ingredientes:', err);
                    return [];
                }),
                productosPreparadosService.obtenerProductosPreparados().catch(err => {
                    console.error('Error al cargar productos preparados:', err);
                    return [];
                }),
                inventarioService.obtenerAlertasStock().catch(err => {
                    console.error('Error al cargar alertas:', err);
                    return { ingredientes: [], productosPreparados: [] };
                }),
                inventarioService.obtenerMovimientos().catch(err => {
                    console.error('Error al cargar movimientos:', err);
                    return [];
                })
            ]);
            
            setIngredientes(ingredientesData);
            setProductosPreparados(productosData);
            setAlertas(alertasData);
            setMovimientos(movimientosData);
            
            console.log('Datos cargados exitosamente');
        } catch (err) {
            console.error('Error general al cargar datos:', err);
            setError(err.message || 'Error al cargar los datos del inventario');
        } finally {
            setLoading(false);
        }
    };

    const cargarIngredientes = async () => {
        try {
            console.log('Cargando ingredientes...');
            const data = await inventarioService.obtenerIngredientes();
            setIngredientes(data);
            console.log('Ingredientes cargados:', data);
        } catch (err) {
            console.error('Error al cargar ingredientes:', err);
            setError('Error al cargar ingredientes: ' + (err.response?.data?.error || err.message));
        }
    };

    const cargarProductosPreparados = async () => {
        try {
            console.log('Cargando productos preparados...');
            const data = await productosPreparadosService.obtenerProductosPreparados();
            
            // Cargar recetas para cada producto
            const productosConReceta = await Promise.all(
                data.map(async (producto) => {
                    try {
                        const receta = await productosPreparadosService.obtenerReceta(producto.id);
                        return { ...producto, receta };
                    } catch (error) {
                        console.error(`Error al cargar receta del producto ${producto.id}:`, error);
                        return { ...producto, receta: [] };
                    }
                })
            );
            
            setProductosPreparados(productosConReceta);
            console.log('Productos preparados con recetas cargados:', productosConReceta);
        } catch (err) {
            console.error('Error al cargar productos preparados:', err);
            setError('Error al cargar productos preparados: ' + (err.response?.data?.error || err.message));
        }
    };

    const cargarAlertas = async () => {
        try {
            console.log('Cargando alertas...');
            const data = await inventarioService.obtenerAlertasStock();
            setAlertas(data);
            console.log('Alertas cargadas:', data);
        } catch (err) {
            console.error('Error al cargar alertas:', err);
        }
    };

    const cargarMovimientos = async () => {
        try {
            console.log('Cargando movimientos...');
            const data = await inventarioService.obtenerMovimientos();
            setMovimientos(data);
            console.log('Movimientos cargados:', data);
        } catch (err) {
            console.error('Error al cargar movimientos:', err);
        }
    };

    // Funciones para ingredientes
    const handleSubmitIngrediente = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            console.log('Enviando formulario de ingrediente:', ingredienteForm);
            
            if (editingIngrediente) {
                console.log('Actualizando ingrediente...');
                await inventarioService.actualizarIngrediente(editingIngrediente.id, ingredienteForm);
                setEditingIngrediente(null);
            } else {
                console.log('Creando nuevo ingrediente...');
                await inventarioService.crearIngrediente(ingredienteForm);
            }
            
            resetIngredienteForm();
            await cargarIngredientes();
            await cargarAlertas();
        } catch (err) {
            console.error('Error al guardar ingrediente:', err);
            setError('Error al guardar ingrediente: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteIngrediente = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este ingrediente?')) {
            try {
                setLoading(true);
                await inventarioService.eliminarIngrediente(id);
                await cargarIngredientes();
                await cargarAlertas();
            } catch (error) {
                console.error('Error al eliminar ingrediente:', error);
                setError('Error al eliminar ingrediente: ' + (error.response?.data?.error || error.message));
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

    let productoCreado;

    if (editingProducto) {
      // 🟡 Si estás editando, actualizás y luego recreás la receta
      await productosPreparadosService.actualizarProductoPreparado(editingProducto.id, productoForm);
      productoCreado = editingProducto;
      await productosPreparadosService.eliminarRecetaPorProducto(editingProducto.id);
    } else {
      // 🟢 Crear nuevo producto y obtener su ID
      const productoData = {
        ...productoForm,
        stock_actual: 0 // empieza en 0, luego se prepara
      };
      productoCreado = await productosPreparadosService.crearProductoPreparado(productoData);
      console.log('✅ Producto creado en backend:', productoCreado);

      if (Array.isArray(productoCreado)) productoCreado = productoCreado[0];
      if (!productoCreado || !productoCreado.id) throw new Error('El backend no devolvió un ID válido');
      console.log('📦 ID del nuevo producto:', productoCreado.id);
    }

    // 🧂 Agregar ingredientes a la receta
    for (const item of recetaItems) {
      if (item.ingrediente_id && item.cantidad > 0) {
        await productosPreparadosService.agregarIngredienteAReceta(
          productoCreado.id,
          item.ingrediente_id,
          item.cantidad
        );
      }
    }

    // 🟢 Preparar automáticamente el producto recién creado
    try {
      console.log('🧩 Preparando automáticamente producto:', productoCreado.id, productoForm.stock_actual);
      await inventarioService.prepararProducto({
        productoId: productoCreado.id,
        cantidad: productoForm.stock_actual || 1
      });
      console.log('✅ Producto preparado automáticamente');
    } catch (error) {
      console.error('❌ Error al preparar producto automáticamente:', error);
      alert('El producto se creó, pero hubo un error al preparar automáticamente.');
    }

    // 🧹 Limpiar y recargar
    resetProductoForm();
    await cargarProductosPreparados();
    await cargarAlertas();

    alert('✅ Producto preparado creado correctamente con su receta');
  } catch (err) {
    console.error('❌ Error al guardar producto:', err);
    setError('Error al guardar producto: ' + (err.response?.data?.error || err.message));
  } finally {
    setLoading(false);
  }
};



    const handleDeleteProducto = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este producto preparado?')) {
            try {
                setLoading(true);
                await productosPreparadosService.eliminarProductoPreparado(id);
                await cargarProductosPreparados();
                await cargarAlertas();
            } catch (error) {
                console.error('Error al eliminar producto:', error);
                setError('Error al eliminar producto: ' + (error.response?.data?.error || error.message));
            } finally {
                setLoading(false);
            }
        }
    };

    // Funciones para recetas
    const agregarIngredienteAReceta = () => {
        setRecetaItems([
            ...recetaItems,
            { ingrediente_id: '', cantidad: 0 }
        ]);
    };

    const actualizarIngredienteReceta = (index, campo, valor) => {
        const nuevosItems = [...recetaItems];
        nuevosItems[index] = {
            ...nuevosItems[index],
            [campo]: valor
        };
        setRecetaItems(nuevosItems);
    };

    const eliminarIngredienteReceta = (index) => {
        const nuevosItems = recetaItems.filter((_, i) => i !== index);
        setRecetaItems(nuevosItems);
    };

    const cargarRecetaProducto = async (productoId) => {
        try {
            const receta = await productosPreparadosService.obtenerReceta(productoId);
            setRecetaItems(receta.map(item => ({
                ingrediente_id: item.ingrediente_id,
                cantidad: item.cantidad
            })));
        } catch (error) {
            console.error('Error al cargar receta:', error);
            setRecetaItems([]);
        }
    };

    const handleEditProducto = async (producto) => {
        setEditingProducto(producto);
setProductoForm({
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    unidad: producto.unidad,
    stock_actual: producto.stock_actual,
    stock_minimo: producto.stock_minimo
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
    console.log('🟢 Preparando producto:', productoId, cantidad);
    const response = await inventarioService.prepararProducto({ productoId, cantidad });
    console.log('✅ Respuesta del backend:', response);

    alert(response.message || 'Producto preparado correctamente');
    await cargarDatos(); // 👈 este sí refresca todo el inventario
  } catch (error) {
    console.error('❌ Error al preparar producto:', error);
    alert(error.response?.data?.error || 'Error al preparar producto');
  }
};




    // Funciones de utilidad
    const resetIngredienteForm = () => {
        setIngredienteForm({
            nombre: '',
            unidad: 'g',
            stock_actual: 0,
            stock_minimo: 1,
            costo_por_unidad: 0
        });
        setShowIngredienteForm(false);
        setEditingIngrediente(null);
    };

    const resetProductoForm = () => {
        setProductoForm({
            nombre: '',
            descripcion: '',
            unidad: 'unidades',
            stock_actual: 0,
            stock_minimo: 5,
            costo_por_unidad: 0
        });
        setRecetaItems([]);
        setShowProductoForm(false);
        setEditingProducto(null);
    };

    const resetRecetaForm = () => {
        setRecetaForm({
            ingrediente_id: '',
            cantidad: 0
        });
        setShowRecetaForm(false);
    };

    const resetPrepararForm = () => {
        setPrepararForm({
            producto_id: '',
            cantidad: 1
        });
        setShowPrepararForm(false);
    };

    const resetVenderProductoForm = () => {
        setVenderProductoForm({
            producto_id: '',
            cantidad: 1
        });
        setShowVenderProductoForm(false);
    };

    const resetVenderPlatoForm = () => {
        setVenderPlatoForm({
            ingredientes: []
        });
        setShowVenderPlatoForm(false);
    };

    const getStockStatus = (stock, minimo) => {
        if (stock <= 0) return 'critico';
        if (stock <= minimo) return 'bajo';
        return 'normal';
    };

    const getStockClass = (status) => {
        switch (status) {
            case 'bajo': return 'stock-bajo';
            case 'critico': return 'stock-critico';
            default: return '';
        }
    };

    const getStockBadge = (status) => {
        switch (status) {
            case 'bajo': return <span className="badge badge-warning">Stock Bajo</span>;
            case 'critico': return <span className="badge badge-danger">Sin Stock</span>;
            default: return <span className="badge badge-success">Stock Normal</span>;
        }
    };

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
                        <button 
                            className="close-error" 
                            onClick={() => setError(null)}
                        >
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
                        {loading && <span className="loading-indicator">Procesando...</span>}
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
            {(alertas.ingredientes.length > 0 || alertas.productosPreparados.length > 0) && (
                <div className="stock-alertas">
                    <h3 className="stock-alertas-title">Alertas de Stock Bajo</h3>
                    <div className="stock-alertas-grid">
                        {alertas.ingredientes.map(item => (
                            <div key={`ing-${item.id}`} className={`stock-alerta-card ${getStockClass(getStockStatus(item.stock_actual, item.stock_minimo))}`}>
                                <div className="stock-alerta-header">
                                    <span className="stock-alerta-nombre">{item.nombre}</span>
                                    <span className="stock-alerta-cantidad">{item.stock_actual} {item.unidad}</span>
                                </div>
                                <div className="stock-alerta-info">
                                    <span>Mínimo: {item.stock_minimo} {item.unidad}</span>
                                    <span>Faltan: {Math.max(0, item.stock_minimo - item.stock_actual)} {item.unidad}</span>
                                </div>
                            </div>
                        ))}
                        {alertas.productosPreparados.map(item => (
                            <div key={`prod-${item.id}`} className={`stock-alerta-card ${getStockClass(getStockStatus(item.stock_actual, item.stock_minimo))}`}>
                                <div className="stock-alerta-header">
                                    <span className="stock-alerta-nombre">{item.nombre}</span>
                                    <span className="stock-alerta-cantidad">{item.stock_actual} {item.unidad}</span>
                                </div>
                                <div className="stock-alerta-info">
                                    <span>Mínimo: {item.stock_minimo} {item.unidad}</span>
                                    <span>Faltan: {Math.max(0, item.stock_minimo - item.stock_actual)} {item.unidad}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Pestañas */}
            <div className="inventario-tabs">
                <button 
                    className={`inventario-tab ${activeTab === 'ingredientes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ingredientes')}
                    disabled={loading}
                >
                    Ingredientes
                </button>
                <button 
                    className={`inventario-tab ${activeTab === 'productos-preparados' ? 'active' : ''}`}
                    onClick={() => setActiveTab('productos-preparados')}
                    disabled={loading}
                >
                    Productos Preparados
                </button>
                <button 
                    className={`inventario-tab ${activeTab === 'movimientos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('movimientos')}
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
                        <div className="ingrediente-form">
                            <h3 className="ingrediente-form-title">
                                {editingIngrediente ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
                            </h3>
                            <form onSubmit={handleSubmitIngrediente}>
                                <div className="ingrediente-form-grid">
                                    <div className="ingrediente-form-group">
                                        <label className="ingrediente-form-label">Nombre</label>
                                        <input 
                                            type="text" 
                                            className="ingrediente-form-input" 
                                            value={ingredienteForm.nombre}
                                            onChange={(e) => setIngredienteForm({...ingredienteForm, nombre: e.target.value})}
                                            required 
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="ingrediente-form-group">
                                        <label className="ingrediente-form-label">Unidad</label>
                                        <select 
                                            className="ingrediente-form-select" 
                                            value={ingredienteForm.unidad}
                                            onChange={(e) => setIngredienteForm({...ingredienteForm, unidad: e.target.value})}
                                            disabled={loading}
                                        >
                                            <option value="g">Gramos (g)</option>
                                            <option value="kg">Kilogramos (kg)</option>
                                            <option value="L">Litros (L)</option>
                                            <option value="ml">Mililitros (ml)</option>
                                            <option value="unidades">Unidades</option>
                                        </select>
                                    </div>
                                    <div className="ingrediente-form-group">
                                        <label className="ingrediente-form-label">Stock Actual</label>
                                        <input 
                                            type="number" 
                                            className="ingrediente-form-input" 
                                            value={ingredienteForm.stock_actual}
                                            onChange={(e) => setIngredienteForm({...ingredienteForm, stock_actual: parseFloat(e.target.value) || 0})}
                                            min="0" 
                                            step="0.01" 
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="ingrediente-form-group">
                                        <label className="ingrediente-form-label">Stock Mínimo</label>
                                        <input 
                                            type="number" 
                                            className="ingrediente-form-input" 
                                            value={ingredienteForm.stock_minimo}
                                            onChange={(e) => setIngredienteForm({...ingredienteForm, stock_minimo: parseFloat(e.target.value) || 0})}
                                            min="0" 
                                            step="0.01" 
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                                <div className="ingrediente-form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? 'Guardando...' : (editingIngrediente ? 'Actualizar' : 'Guardar')}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={resetIngredienteForm} disabled={loading}>
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    
                    {/* Formulario de producto preparado con receta */}
                    {showProductoForm && (
                        <div className="ingrediente-form">
                            <h3 className="ingrediente-form-title">
                                {editingProducto ? 'Editar Producto Preparado' : 'Nuevo Producto Preparado'}
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
                                            onChange={(e) => setProductoForm({...productoForm, nombre: e.target.value})}
                                            required 
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="ingrediente-form-group">
                                        <label className="ingrediente-form-label">Descripción</label>
                                        <textarea 
                                            className="ingrediente-form-input" 
                                            value={productoForm.descripcion}
                                            onChange={(e) => setProductoForm({...productoForm, descripcion: e.target.value})}
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="ingrediente-form-group">
                                        <label className="ingrediente-form-label">Unidad</label>
                                        <select 
                                            className="ingrediente-form-select" 
                                            value={productoForm.unidad}
                                            onChange={(e) => setProductoForm({...productoForm, unidad: e.target.value})}
                                            disabled={loading}
                                        >
                                            <option value="unidades">Unidades</option>
                                            <option value="porciones">Porciones</option>
                                            <option value="litros">Litros</option>
                                            <option value="kg">Kg</option>
                                        </select>
                                    </div>
                                    <div className="ingrediente-form-group">
                                        <label className="ingrediente-form-label">Stock Actual</label>
                                        <input 
                                            type="number" 
                                            className="ingrediente-form-input" 
                                            value={productoForm.stock_actual}
                                            onChange={(e) => setProductoForm({...productoForm, stock_actual: parseFloat(e.target.value) || 0})}
                                            min="0" 
                                            step="0.01" 
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="ingrediente-form-group">
                                        <label className="ingrediente-form-label">Stock Mínimo</label>
                                        <input 
                                            type="number" 
                                            className="ingrediente-form-input" 
                                            value={productoForm.stock_minimo}
                                            onChange={(e) => setProductoForm({...productoForm, stock_minimo: parseFloat(e.target.value) || 0})}
                                            min="0" 
                                            step="0.01" 
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                                
                                {/* Sección de receta */}
                                <div className="receta-section">
                                    <h4 className="receta-title">Receta del Producto</h4>
                                    <p className="receta-description">
                                        Agrega los ingredientes necesarios para preparar este producto
                                    </p>
                                    
                                    {recetaItems.map((item, index) => (
                                        <div key={index} className="receta-item">
                                            <div className="receta-item-grid">
                                                <div className="receta-item-group">
                                                    <label className="receta-item-label">Ingrediente</label>
                                                    <select 
                                                        className="receta-item-select" 
                                                        value={item.ingrediente_id}
                                                        onChange={(e) => actualizarIngredienteReceta(index, 'ingrediente_id', e.target.value)}
                                                        required
                                                        disabled={loading}
                                                    >
                                                        <option value="">Seleccionar ingrediente</option>
                                                        {ingredientes.map(ingrediente => (
                                                            <option key={ingrediente.id} value={ingrediente.id}>
                                                                {ingrediente.nombre} ({ingrediente.unidad})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="receta-item-group">
                                                    <label className="receta-item-label">Cantidad</label>
                                                    <input 
                                                        type="number" 
                                                        className="receta-item-input" 
                                                        value={item.cantidad}
                                                        onChange={(e) => actualizarIngredienteReceta(index, 'cantidad', parseFloat(e.target.value) || 0)}
                                                        min="0.01" 
                                                        step="0.01" 
                                                        required
                                                        disabled={loading}
                                                    />
                                                </div>
                                                <div className="receta-item-group">
                                                    <label className="receta-item-label">Acción</label>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => eliminarIngredienteReceta(index)}
                                                        disabled={loading}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
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
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? 'Guardando...' : (editingProducto ? 'Actualizar' : 'Guardar')}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={resetProductoForm} disabled={loading}>
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                    
                    {/* Contenido de la pestaña activa */}
                    {activeTab === 'ingredientes' && (
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
                            ) : (
                                ingredientes.map(ingrediente => (
                                    <div key={ingrediente.id} className={`ingrediente-card ${getStockClass(getStockStatus(ingrediente.stock_actual, ingrediente.stock_minimo))}`}>
                                        <div className="ingrediente-header">
                                            <h3 className="ingrediente-nombre">{ingrediente.nombre}</h3>
                                            <div className="ingrediente-acciones">
                                                <button className="btn btn-icon" onClick={() => {
                                                    setEditingIngrediente(ingrediente);
                                                    setIngredienteForm(ingrediente);
                                                    setShowIngredienteForm(true);
                                                }} title="Editar" disabled={loading}>
                                                    ✏️
                                                </button>
                                                <button className="btn btn-icon" onClick={() => handleDeleteIngrediente(ingrediente.id)} title="Eliminar" disabled={loading}>
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                        <div className="ingrediente-info">
                                            <div className="ingrediente-info-item">
                                                <span className="ingrediente-info-label">Unidad:</span>
                                                <span className="ingrediente-info-value">{ingrediente.unidad}</span>
                                            </div>
                                        </div>
                                        <div className={`ingrediente-stock ${getStockClass(getStockStatus(ingrediente.stock_actual, ingrediente.stock_minimo))}`}>
                                            <span className="ingrediente-stock-actual">{ingrediente.stock_actual} {ingrediente.unidad}</span>
                                            <span className="ingrediente-stock-minimo">Mín: {ingrediente.stock_minimo} {ingrediente.unidad}</span>
                                        </div>
                                        <div className="ingrediente-status">
                                            {getStockBadge(getStockStatus(ingrediente.stock_actual, ingrediente.stock_minimo))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'productos-preparados' && (
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
                            ) : (
                                productosPreparados.map(producto => (
                                    <div key={producto.id} className={`ingrediente-card ${getStockClass(getStockStatus(producto.stock_actual, producto.stock_minimo))}`}>
                                        <div className="ingrediente-header">
                                            <h3 className="ingrediente-nombre">{producto.nombre}</h3>
                                            <div className="ingrediente-acciones">
                                                <button className="btn btn-icon" onClick={() => handleEditProducto(producto)} title="Editar" disabled={loading}>
                                                    ✏️
                                                </button>
                                                <button className="btn btn-icon" onClick={() => handleDeleteProducto(producto.id)} title="Eliminar" disabled={loading}>
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                        <div className="ingrediente-info">
                                            <div className="ingrediente-info-item">
                                                <span className="ingrediente-info-label">Unidad:</span>
                                                <span className="ingrediente-info-value">{producto.unidad}</span>
                                            </div>
                                        </div>
                                        <div className={`ingrediente-stock ${getStockClass(getStockStatus(producto.stock_actual, producto.stock_minimo))}`}>
                                            <span className="ingrediente-stock-actual">{producto.stock_actual} {producto.unidad}</span>
                                            <span className="ingrediente-stock-minimo">Mín: {producto.stock_minimo} {producto.unidad}</span>
                                        </div>
                                        <div className="ingrediente-status">
                                            {getStockBadge(getStockStatus(producto.stock_actual, producto.stock_minimo))}
                                        </div>
                                        
                                        {/* Botón para preparar producto */}
                                        
                                        {/* Mostrar receta del producto */}
                                        <div className="producto-receta">
                                            <h5>📝 Receta:</h5>
                                            {producto.receta && producto.receta.length > 0 ? (
                                                <ul className="receta-list">
                                                    {producto.receta.map((item, index) => (
                                                        <li key={index}>
                                                            • {item.ingrediente_nombre}: {item.cantidad} {item.ingrediente_unidad}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="no-receta">⚠️ No hay receta definida</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'movimientos' && (
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
                                            {movimientos.map(movimiento => (
                                                <tr key={movimiento.id}>
                                                    <td>{new Date(movimiento.fecha_creacion).toLocaleDateString()}</td>
                                                    <td>
                                                        <span className={`movimiento-badge ${movimiento.tipo_inventario}`}>
                                                            {movimiento.tipo_inventario === 'ingrediente' ? 'Ingrediente' : 'Producto Preparado'}
                                                        </span>
                                                    </td>
                                                    <td>{movimiento.item_nombre}</td>
                                                    <td>
                                                        <span className={`movimiento-badge ${movimiento.tipo}`}>
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