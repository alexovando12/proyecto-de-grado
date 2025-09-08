import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { productoService } from '../services/productoService.js';

const ProductosPage = () => {
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: 'plato'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [filteredProductos, setFilteredProductos] = useState([]);

  const categorias = [
    { value: 'todos', label: 'Todas las categorías' },
    { value: 'plato', label: 'Platos' },
    { value: 'bebida', label: 'Bebidas' },
    { value: 'postre', label: 'Postres' },
    { value: 'entrada', label: 'Entradas' }
  ];

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    filtrarProductos();
  }, [productos, searchTerm, categoriaFiltro]);

  const cargarProductos = async () => {
    try {
      const data = await productoService.obtenerTodos();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarProductos = () => {
    let filtrados = productos;

    // Filtrar por categoría
    if (categoriaFiltro !== 'todos') {
      filtrados = filtrados.filter(p => p.categoria === categoriaFiltro);
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtrados = filtrados.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProductos(filtrados);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productoData = {
        ...formData,
        precio: parseFloat(formData.precio)
      };

      if (editingProducto) {
        await productoService.actualizar(editingProducto.id, productoData);
        setEditingProducto(null);
      } else {
        await productoService.crear(productoData);
      }

      setFormData({
        nombre: '',
        descripcion: '',
        precio: '',
        categoria: 'plato'
      });
      setShowForm(false);
      cargarProductos();
    } catch (error) {
      console.error('Error al guardar producto:', error);
    }
  };

  const handleEdit = (producto) => {
    setEditingProducto(producto);
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio.toString(),
      categoria: producto.categoria
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await productoService.eliminar(id);
        cargarProductos();
      } catch (error) {
        console.error('Error al eliminar producto:', error);
      }
    }
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
      console.error('Error al buscar productos:', error);
    }
  };

  const getCategoriaIcon = (categoria) => {
    switch (categoria) {
      case 'plato': return '🍽️';
      case 'bebida': return '🥤';
      case 'postre': return '🍰';
      case 'entrada': return '🥗';
      default: return '🍴';
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="productos-container">
      <header className="productos-header">
        <div className="productos-header-content">
          <div>
            <h1 className="productos-title">Catálogo de Productos</h1>
          </div>
          <div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Nuevo Producto
            </button>
          </div>
        </div>
      </header>

      <main className="productos-content">
        <div className="container">
          {showForm && (
            <div className="producto-form">
              <h3 className="producto-form-title">
                {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="producto-form-group">
                  <label className="producto-form-label">Nombre</label>
                  <input
                    type="text"
                    className="producto-form-input"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    required
                  />
                </div>
                <div className="producto-form-group">
                  <label className="producto-form-label">Descripción</label>
                  <textarea
                    className="producto-form-textarea"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    required
                  />
                </div>
                <div className="producto-form-group">
                  <label className="producto-form-label">Precio</label>
                  <input
                    type="number"
                    className="producto-form-input"
                    value={formData.precio}
                    onChange={(e) => setFormData({...formData, precio: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    required
                  >
                    <option value="plato">Plato</option>
                    <option value="bebida">Bebida</option>
                    <option value="postre">Postre</option>
                    <option value="entrada">Entrada</option>
                  </select>
                </div>
                <div className="producto-form-actions">
                  <button type="submit" className="producto-form-btn producto-form-btn-primary">
                    {editingProducto ? 'Actualizar' : 'Guardar'}
                  </button>
                  <button type="button" className="producto-form-btn producto-form-btn-secondary" onClick={() => {
                    setShowForm(false);
                    setEditingProducto(null);
                    setFormData({
                      nombre: '',
                      descripcion: '',
                      precio: '',
                      categoria: 'plato'
                    });
                  }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

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
              {categorias.map(categoria => (
                <button
                  key={categoria.value}
                  className={`btn ${categoriaFiltro === categoria.value ? 'btn-primary' : 'btn-secondary'}`}
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
              <div className="productos-empty-text">No se encontraron productos</div>
            </div>
          ) : (
            <div className="productos-grid">
              {filteredProductos.map(producto => (
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
                    {producto.categoria.charAt(0).toUpperCase() + producto.categoria.slice(1)}
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