const pool = require('../config/db');

class ProductoPreparado {

  static async obtenerTodos() {
    const result = await pool.query(
      'SELECT * FROM productos_preparados ORDER BY nombre ASC'
    );
    return result.rows;
  }

  static async obtenerPorId(id) {
    const result = await pool.query(
      'SELECT * FROM productos_preparados WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // =========================
  // CREAR PRODUCTO PREPARADO
  // =========================
  static async crear(producto) {
    let { nombre, descripcion, unidad, stock_actual, stock_minimo } = producto;

    // 🔥 VALIDACIONES
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      throw new Error('Nombre inválido');
    }

    nombre = nombre.trim();

    unidad = (unidad || 'unidad').toString().trim();

    const stockActual = Number(stock_actual) || 0;
    const stockMinimo = Number(stock_minimo) || 0;

    if (stockActual < 0 || stockActual > 10000) {
      throw new Error('Stock inicial inválido');
    }

    if (stockMinimo < 0 || stockMinimo > 10000) {
      throw new Error('Stock mínimo inválido');
    }

    const result = await pool.query(
      `INSERT INTO productos_preparados 
       (nombre, descripcion, unidad, stock_actual, stock_minimo) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [nombre, descripcion, unidad, stockActual, stockMinimo]
    );

    return result.rows[0];
  }

  // =========================
  // ACTUALIZAR PRODUCTO
  // =========================
  static async actualizar(id, producto) {
    let { nombre, descripcion, unidad, stock_actual, stock_minimo } = producto;

    if (!nombre || !nombre.trim()) {
      throw new Error('Nombre inválido');
    }

    const stockActual = Number(stock_actual);
    const stockMinimo = Number(stock_minimo);

    if (!Number.isFinite(stockActual) || stockActual < 0) {
      throw new Error('Stock inválido');
    }

    const result = await pool.query(
      `UPDATE productos_preparados
       SET nombre = $1,
           descripcion = $2,
           unidad = $3,
           stock_actual = $4,
           stock_minimo = $5
       WHERE id = $6
       RETURNING *`,
      [nombre.trim(), descripcion, unidad, stockActual, stockMinimo, id]
    );

    if (result.rowCount === 0) {
      throw new Error('Producto no encontrado');
    }

    return result.rows[0];
  }

  // =========================
  // ELIMINAR (VALIDADO)
  // =========================
  static async eliminar(id) {

    // 🔥 Validar si se usa en productos
    const uso = await pool.query(
      'SELECT 1 FROM productos WHERE producto_preparado_id = $1 LIMIT 1',
      [id]
    );

    if (uso.rows.length > 0) {
      throw new Error('No puedes eliminar este producto porque está en uso');
    }

    const result = await pool.query(
      'DELETE FROM productos_preparados WHERE id = $1 RETURNING *',
      [id]
    );

    return result.rows[0];
  }

  // =========================
  // PREPARAR PRODUCTO 🔥🔥🔥
  // =========================
  static async preparar(id, cantidad) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const cantidadNum = Number(cantidad);

      if (!Number.isFinite(cantidadNum) || cantidadNum <= 0 || cantidadNum > 1000) {
        throw new Error('Cantidad inválida');
      }

      // 🔥 Obtener receta
      const receta = await client.query(
        `SELECT r.ingrediente_id, r.cantidad, i.stock_actual, i.nombre, i.unidad
         FROM recetas r
         JOIN ingredientes i ON i.id = r.ingrediente_id
         WHERE r.producto_preparado_id = $1`,
        [id]
      );

      if (receta.rows.length === 0) {
        throw new Error('Este producto no tiene receta');
      }

      // 🔥 Validar stock
      for (const item of receta.rows) {
        const necesario = Number(item.cantidad) * cantidadNum;

        if (item.stock_actual < necesario) {
          throw new Error(
            `Stock insuficiente de ${item.nombre}. Disponible: ${item.stock_actual} ${item.unidad}`
          );
        }
      }

      // 🔥 Descontar ingredientes
      for (const item of receta.rows) {
        const necesario = Number(item.cantidad) * cantidadNum;

        await client.query(
          `UPDATE ingredientes
           SET stock_actual = stock_actual - $1
           WHERE id = $2`,
          [necesario, item.ingrediente_id]
        );
      }

      // 🔥 Aumentar producto preparado
      const result = await client.query(
        `UPDATE productos_preparados
         SET stock_actual = stock_actual + $1
         WHERE id = $2
         RETURNING *`,
        [cantidadNum, id]
      );

      await client.query('COMMIT');

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================
  // VENDER PRODUCTO
  // =========================
  static async vender(id, cantidad) {

    const cantidadNum = Number(cantidad);

    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      throw new Error('Cantidad inválida');
    }

    const producto = await this.obtenerPorId(id);

    if (!producto) throw new Error('Producto no encontrado');

    if (producto.stock_actual < cantidadNum) {
      throw new Error('Stock insuficiente');
    }

    const result = await pool.query(
      `UPDATE productos_preparados
       SET stock_actual = stock_actual - $1
       WHERE id = $2
       RETURNING *`,
      [cantidadNum, id]
    );

    return result.rows[0];
  }
}

module.exports = ProductoPreparado;