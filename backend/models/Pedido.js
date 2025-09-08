const pool = require('../config/db');

class Pedido {
  static async obtenerTodos() {
    const result = await pool.query(`
      SELECT p.*, m.numero as mesa_numero, u.nombre as mozo_nombre
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.fecha_creacion DESC
    `);
    return result.rows;
  }

  static async obtenerPorId(id) {
    const result = await pool.query(`
      SELECT p.*, m.numero as mesa_numero, u.nombre as mozo_nombre
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async crear(pedido) {
    const { mesa_id, usuario_id } = pedido;
    const result = await pool.query(
      'INSERT INTO pedidos (mesa_id, usuario_id, estado, total, fecha_creacion) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [mesa_id, usuario_id, 'pendiente', 0]
    );
    return result.rows[0];
  }

  static async actualizar(id, pedido) {
    const { mesa_id, usuario_id, estado, total } = pedido;
    const result = await pool.query(
      'UPDATE pedidos SET mesa_id = $1, usuario_id = $2, estado = $3, total = $4, fecha_actualizacion = NOW() WHERE id = $5 RETURNING *',
      [mesa_id, usuario_id, estado, total, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const result = await pool.query('DELETE FROM pedidos WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async obtenerPorMesa(mesa_id) {
    const result = await pool.query(`
      SELECT p.*, m.numero as mesa_numero, u.nombre as mozo_nombre
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.mesa_id = $1 AND p.estado != 'entregado'
      ORDER BY p.fecha_creacion
    `, [mesa_id]);
    return result.rows;
  }

  static async obtenerPorEstado(estado) {
    const result = await pool.query(`
      SELECT p.*, m.numero as mesa_numero, u.nombre as mozo_nombre
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.estado = $1
      ORDER BY p.fecha_creacion
    `, [estado]);
    return result.rows;
  }
}

module.exports = Pedido;