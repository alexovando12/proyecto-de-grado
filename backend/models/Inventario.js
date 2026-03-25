const pool = require('../config/db');

class Inventario {
  static async obtenerTodos() {
    const result = await pool.query(`
      SELECT i.*, p.nombre as producto_nombre, p.unidad
      FROM inventario i
      JOIN productos p ON i.producto_id = p.id
      ORDER BY i.stock_actual ASC
    `);
    return result.rows;
  }

  static async obtenerBajoStock() {
    const result = await pool.query(`
      SELECT i.*, p.nombre as producto_nombre, p.unidad
      FROM inventario i
      JOIN productos p ON i.producto_id = p.id
      WHERE i.stock_actual <= i.stock_minimo
      ORDER BY i.stock_actual ASC
    `);
    return result.rows;
  }

  static async obtenerPorId(id) {
    const result = await pool.query(`
      SELECT i.*, p.nombre as producto_nombre, p.unidad
      FROM inventario i
      JOIN productos p ON i.producto_id = p.id
      WHERE i.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async crear(inventario) {
    const { producto_id, stock_actual, stock_minimo } = inventario;
    const result = await pool.query(
      'INSERT INTO inventario (producto_id, stock_actual, stock_minimo) VALUES ($1, $2, $3) RETURNING *',
      [producto_id, stock_actual, stock_minimo]
    );
    return result.rows[0];
  }

  static async actualizar(id, inventario) {
    const { stock_actual, stock_minimo } = inventario;
    const result = await pool.query(
      'UPDATE inventario SET stock_actual = $1, stock_minimo = $2 WHERE id = $3 RETURNING *',
      [stock_actual, stock_minimo, id]
    );
    return result.rows[0];
  }

  static async registrarMovimiento(movimiento) {
    const { ingrediente_id, tipo, cantidad, motivo, usuario_id } = movimiento;
    const result = await pool.query(
      'INSERT INTO movimientos_inventario (ingrediente_id, tipo, cantidad, motivo, usuario_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [ingrediente_id, tipo, cantidad, motivo, usuario_id]
    );
    return result.rows[0];
  }

  static async ajustarStock(id, cantidad, tipo) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cantidadNum = Number(cantidad);
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      throw new Error('Cantidad inválida');
    }

    const stockRow = await client.query(
      'SELECT stock_actual FROM inventario WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (!stockRow.rows.length) throw new Error('Item no encontrado');

    const stock = Number(stockRow.rows[0].stock_actual);
    let nuevoStock = tipo === 'entrada'
      ? stock + cantidadNum
      : stock - cantidadNum;

    if (nuevoStock < 0) {
      throw new Error('Stock insuficiente');
    }

    await client.query(
      'UPDATE inventario SET stock_actual=$1 WHERE id=$2',
      [nuevoStock, id]
    );

    await client.query('COMMIT');
    return { success: true };

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
}

module.exports = Inventario;