const pool = require('../config/db');
const DetallePedido = require('./DetallePedido');

class Pedido {
  static async obtenerTodosConDetalles() {
    const result = await pool.query(`
      SELECT p.*, m.numero AS mesa_numero, u.nombre AS mozo_nombre
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.fecha_creacion DESC
    `);

    const pedidos = [];
    for (const p of result.rows) {
      const detalles = await DetallePedido.obtenerPorPedido(p.id);
      pedidos.push({ ...p, detalles });
    }
    return pedidos;
  }

  static async obtenerPorIdConDetalles(id) {
    const result = await pool.query(`
      SELECT p.*, m.numero AS mesa_numero, u.nombre AS mozo_nombre
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1
    `, [id]);

    const pedido = result.rows[0];
    if (!pedido) return null;

    const detalles = await DetallePedido.obtenerPorPedido(id);
    return { ...pedido, detalles };
  }

  static async crear(pedido) {
    const { mesa_id, usuario_id, estado, total } = pedido;
    const result = await pool.query(
      `INSERT INTO pedidos (mesa_id, usuario_id, estado, total, fecha_creacion) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING *`,
      [mesa_id, usuario_id, estado, total]
    );
    return result.rows[0];
  }

  static async actualizar(id, pedido) {
    const { mesa_id, usuario_id, estado, total } = pedido;
    const result = await pool.query(
      `UPDATE pedidos 
       SET mesa_id = $1, usuario_id = $2, estado = $3, total = $4, fecha_actualizacion = NOW() 
       WHERE id = $5 
       RETURNING *`,
      [mesa_id, usuario_id, estado, total, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const result = await pool.query(
      'DELETE FROM pedidos WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async obtenerPorMesaConDetalles(mesa_id) {
    const result = await pool.query(`
      SELECT p.*, m.numero AS mesa_numero, u.nombre AS mozo_nombre
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.mesa_id = $1 AND p.estado != 'entregado'
      ORDER BY p.fecha_creacion
    `, [mesa_id]);

    const pedidos = [];
    for (const p of result.rows) {
      const detalles = await DetallePedido.obtenerPorPedido(p.id);
      pedidos.push({ ...p, detalles });
    }
    return pedidos;
  }

  static async obtenerPorEstadoConDetalles(estado) {
    const result = await pool.query(`
      SELECT p.*, m.numero AS mesa_numero, u.nombre AS mozo_nombre
      FROM pedidos p
      LEFT JOIN mesas m ON p.mesa_id = m.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.estado = $1
      ORDER BY p.fecha_creacion ASC
    `, [estado]);

    const pedidos = [];
    for (const p of result.rows) {
      const detalles = await DetallePedido.obtenerPorPedido(p.id);
      pedidos.push({ ...p, detalles });
    }
    return pedidos;
  }
}

module.exports = Pedido;
