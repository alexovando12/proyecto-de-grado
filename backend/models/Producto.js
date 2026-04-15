const pool = require('../config/db');
const Receta = require('./Receta'); // 👈 Importamos el modelo de recetas

class Producto {
  static async obtenerTodos() {
    const result = await pool.query('SELECT * FROM productos ORDER BY nombre');
    return result.rows;
  }

  static async obtenerPorId(id) {
    const result = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async obtenerRecetaPorProductoId(productoId) {
    const result = await pool.query(
      `SELECT
         r.ingrediente_id,
         r.cantidad,
         i.nombre AS ingrediente_nombre,
         i.unidad AS ingrediente_unidad
       FROM recetas r
       JOIN ingredientes i ON i.id = r.ingrediente_id
       WHERE r.producto_id = $1
       ORDER BY i.nombre`,
      [productoId]
    );

    return result.rows;
  }

 static async crear(producto) {
  const {
    nombre,
    descripcion,
    precio,
    categoria,
    tipo_inventario = 'general',
    producto_preparado_id,
    receta = []
  } = producto;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (!nombre || !nombre.trim()) {
      throw new Error('Nombre inválido');
    }

    if (!precio || Number(precio) <= 0) {
      throw new Error('Precio inválido');
    }

    if (!categoria) {
      throw new Error('Categoría requerida');
    }

    if (tipo_inventario === 'preparado' && !producto_preparado_id) {
      throw new Error('Debes seleccionar un producto preparado asociado');
    }

    const productoPreparadoIdFinal =
      tipo_inventario === 'preparado' ? Number(producto_preparado_id) : null;

    const result = await client.query(
      `INSERT INTO productos
       (nombre, descripcion, precio, categoria, tipo_inventario, producto_preparado_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        nombre.trim(),
        descripcion,
        Number(precio),
        categoria,
        tipo_inventario,
        productoPreparadoIdFinal
      ]
    );

    const nuevoProducto = result.rows[0];

    if (tipo_inventario === 'general' && receta.length > 0) {
      for (const item of receta) {
        await client.query(
          `INSERT INTO recetas (producto_id, ingrediente_id, cantidad)
           VALUES ($1, $2, $3)`,
          [nuevoProducto.id, item.ingrediente_id, item.cantidad]
        );
      }
    }

    await client.query('COMMIT');
    return nuevoProducto;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

  static async actualizar(id, producto) {
  const {
    nombre,
    descripcion,
    precio,
    categoria,
    tipo_inventario = 'general',
    producto_preparado_id,
    receta = []
  } = producto;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (!nombre || !nombre.trim()) {
      throw new Error('Nombre inválido');
    }

    if (!precio || Number(precio) <= 0) {
      throw new Error('Precio inválido');
    }

    if (!categoria) {
      throw new Error('Categoría requerida');
    }

    if (tipo_inventario === 'preparado' && !producto_preparado_id) {
      throw new Error('Debes seleccionar un producto preparado asociado');
    }

    const productoPreparadoIdFinal =
      tipo_inventario === 'preparado' ? Number(producto_preparado_id) : null;

    const result = await client.query(
      `UPDATE productos
       SET nombre = $1,
           descripcion = $2,
           precio = $3,
           categoria = $4,
           tipo_inventario = $5,
           producto_preparado_id = $6
       WHERE id = $7
       RETURNING *`,
      [
        nombre.trim(),
        descripcion,
        Number(precio),
        categoria,
        tipo_inventario,
        productoPreparadoIdFinal,
        id
      ]
    );

    const productoActualizado = result.rows[0];

    if (!productoActualizado) {
      throw new Error('Producto no encontrado');
    }

    await client.query('DELETE FROM recetas WHERE producto_id = $1', [id]);

    if (tipo_inventario === 'general' && receta.length > 0) {
      for (const item of receta) {
        await client.query(
          `INSERT INTO recetas (producto_id, ingrediente_id, cantidad)
           VALUES ($1, $2, $3)`,
          [id, item.ingrediente_id, item.cantidad]
        );
      }
    }

    await client.query('COMMIT');
    return productoActualizado;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

static async eliminar(id) {
  const uso = await pool.query(
    'SELECT 1 FROM detalles_pedido WHERE producto_id = $1 LIMIT 1',
    [id]
  );

  if (uso.rows.length > 0) {
    throw new Error('No puedes eliminar un producto usado en pedidos');
  }

  const result = await pool.query(
    'DELETE FROM productos WHERE id = $1 RETURNING *',
    [id]
  );

  return result.rows[0];
}
  static async obtenerPorCategoria(categoria) {
    const result = await pool.query('SELECT * FROM productos WHERE categoria = $1 ORDER BY nombre', [categoria]);
    return result.rows;
  }

  static async buscar(termino) {
    const result = await pool.query(
      "SELECT * FROM productos WHERE nombre ILIKE $1 OR descripcion ILIKE $1 ORDER BY nombre",
      [`%${termino}%`]
    );
    return result.rows;
  }
}

module.exports = Producto;
