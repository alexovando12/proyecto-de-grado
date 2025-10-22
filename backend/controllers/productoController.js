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
    const {
      nombre,
      descripcion,
      precio,
      categoria,
      tipo_inventario,
      receta,
      producto_preparado_id  // ← nuevo parámetro opcional
    } = req.body;

    if (!nombre || !precio || !categoria) {
      return res.status(400).json({ error: 'Nombre, precio y categoría son requeridos' });
    }

    await client.query('BEGIN');

    let productoPreparadoId = null;

    if (tipo_inventario === 'preparado') {
      if (producto_preparado_id) {
        // Validar que exista
        const valid = await client.query('SELECT id FROM productos_preparados WHERE id = $1', [producto_preparado_id]);
        if (valid.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'El producto preparado especificado no existe' });
        }
        productoPreparadoId = producto_preparado_id;
      } else {
        // Buscar por nombre como respaldo
        const prepResult = await client.query(
          `SELECT id FROM productos_preparados WHERE LOWER(nombre) = LOWER($1) LIMIT 1`,
          [nombre]
        );
        if (prepResult.rowCount > 0) {
          productoPreparadoId = prepResult.rows[0].id;
        } else {
          // Podrías exigir que lo seleccione si quieres
          // return res.status(400).json({ error: 'Debes seleccionar un producto preparado existente' });
        }
      }
    }

    const productoResult = await client.query(
      `INSERT INTO productos (nombre, descripcion, precio, categoria, tipo_inventario, producto_preparado_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [nombre, descripcion, precio, categoria, tipo_inventario || 'general', productoPreparadoId]
    );

    const productoId = productoResult.rows[0].id;

    // Insertar ingredientes si hay receta
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