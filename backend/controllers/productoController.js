const pool = require('../config/db');

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
  const client = await pool.connect();
  try {
    const { nombre, descripcion, precio, categoria, tipo_inventario, receta } = req.body;

    if (!nombre || !precio || !categoria) {
      return res.status(400).json({ error: 'Nombre, precio y categoría son requeridos' });
    }

    await client.query('BEGIN');

    // 1️⃣ Crear producto principal
    const productoResult = await client.query(
      `INSERT INTO productos (nombre, descripcion, precio, categoria, tipo_inventario)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [nombre, descripcion, precio, categoria, tipo_inventario || 'general']
    );

    const productoId = productoResult.rows[0].id;

    // 2️⃣ Si viene una receta, la guardamos
    if (Array.isArray(receta) && receta.length > 0) {
      for (const item of receta) {
        await client.query(
          `INSERT INTO recetas (producto_id, ingrediente_id, cantidad)
           VALUES ($1, $2, $3)`,
          [productoId, item.ingrediente_id, item.cantidad]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ message: 'Producto creado correctamente', productoId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en crearProducto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
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
    console.error('Error al actualizar producto:', error);
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