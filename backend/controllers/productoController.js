const Producto = require('../models/Producto');

exports.obtenerProductos = async (req, res) => {
  try {
    const productos = await Producto.obtenerTodos();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.obtenerPorId(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crearProducto = async (req, res) => {
  try {
    const producto = await Producto.crear(req.body);
    res.status(201).json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.actualizar(id, req.body);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.eliminar(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerProductosPorCategoria = async (req, res) => {
  try {
    const { categoria } = req.params;
    const productos = await Producto.obtenerPorCategoria(categoria);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.buscarProductos = async (req, res) => {
  try {
    const { termino } = req.query;
    if (!termino) {
      return res.status(400).json({ error: 'Término de búsqueda requerido' });
    }
    const productos = await Producto.buscar(termino);
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};