const pool = require('../config/db');

class DetallePedido {
  static async obtenerPorPedido(pedido_id) {
    const result = await pool.query(`
      SELECT dp.*, pr.nombre AS producto_nombre, pr.precio
      FROM detalles_pedido dp
      LEFT JOIN productos pr ON dp.producto_id = pr.id
      WHERE dp.pedido_id = $1
      ORDER BY dp.id
    `, [pedido_id]);
    return result.rows;
  }

  static async crear(detalle) {
    const { pedido_id, producto_id, cantidad, notas, precio } = detalle;
    const result = await pool.query(
      `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, notas, precio, estado) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [pedido_id, producto_id, cantidad, notas, precio, 'pendiente']
    );
    return result.rows[0];
  }

  static async actualizar(id, detalle) {
    const { cantidad, notas, estado } = detalle;
    const result = await pool.query(
      `UPDATE detalles_pedido 
       SET cantidad = $1, notas = $2, estado = $3 
       WHERE id = $4 
       RETURNING *`,
      [cantidad, notas, estado, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const result = await pool.query(
      'DELETE FROM detalles_pedido WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async actualizarEstadoPorPedido(pedido_id, estado) {
    const result = await pool.query(
      'UPDATE detalles_pedido SET estado = $1 WHERE pedido_id = $2',
      [estado, pedido_id]
    );
    return result.rows;
  }
}

module.exports = DetallePedido;
