const pool = require('../config/db');
const Ingrediente = require('./Ingrediente');
const ProductoPreparado = require('./ProductoPreparado');


class Pedido {
  static async crear(pedido) {
    const { mesa_id, usuario_id = null, estado = 'preparando', total = 0 } = pedido;

    const result = await pool.query(
      `INSERT INTO pedidos (mesa_id, usuario_id, estado, total, fecha_creacion, fecha_actualizacion)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [mesa_id, usuario_id, estado, total]
    );

    return result.rows[0];
  }

  static async actualizar(id, pedido) {
    const mesa_id = pedido.mesa_id ?? null;
    const usuario_id = pedido.usuario_id ?? null;
    const estado = pedido.estado ?? null;
    const total = pedido.total ?? null;

    const result = await pool.query(
      `UPDATE pedidos
       SET mesa_id = COALESCE($1, mesa_id),
           usuario_id = COALESCE($2, usuario_id),
           estado = COALESCE($3, estado),
           total = COALESCE($4, total),
           fecha_actualizacion = NOW()
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

  static async obtenerTodosConDetalles() {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.mesa_id,
        p.estado,
        p.total,
        d.id AS detalle_id,
        d.producto_id,
        d.cantidad,
        d.precio,
        d.notas,
        pr.nombre AS producto_nombre
      FROM pedidos p
      LEFT JOIN detalles_pedido d ON d.pedido_id = p.id
      LEFT JOIN productos pr ON pr.id = d.producto_id
      ORDER BY p.id DESC
    `);

    const pedidosMap = {};

    for (const row of result.rows) {
      if (!pedidosMap[row.id]) {
        pedidosMap[row.id] = {
          id: row.id,
          mesa_id: row.mesa_id,
          estado: row.estado,
          total: row.total,
          detalles: []
        };
      }

      if (row.detalle_id && row.producto_id) {
        pedidosMap[row.id].detalles.push({
          id: row.detalle_id,
          producto_id: row.producto_id,
          producto_nombre: row.producto_nombre,
          cantidad: row.cantidad,
          precio: row.precio,
          notas: row.notas
        });
      }
    }

    return Object.values(pedidosMap);
  }

  static async obtenerPorIdConDetalles(id) {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.mesa_id,
        p.estado,
        p.total,
        d.id AS detalle_id,
        d.producto_id,
        d.cantidad,
        d.precio,
        d.notas,
        pr.nombre AS producto_nombre
      FROM pedidos p
      LEFT JOIN detalles_pedido d ON d.pedido_id = p.id
      LEFT JOIN productos pr ON pr.id = d.producto_id
      WHERE p.id = $1
    `, [id]);

    const pedidos = {};

    for (const row of result.rows) {
      if (!pedidos[row.id]) {
        pedidos[row.id] = {
          id: row.id,
          mesa_id: row.mesa_id,
          estado: row.estado,
          total: row.total,
          detalles: []
        };
      }

      if (row.detalle_id && row.producto_id) {
        pedidos[row.id].detalles.push({
          id: row.detalle_id,
          producto_id: row.producto_id,
          producto_nombre: row.producto_nombre,
          cantidad: row.cantidad,
          precio: row.precio,
          notas: row.notas
        });
      }
    }

    return pedidos[id];
  }

  static async obtenerPorEstadoConDetalles(estado) {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.mesa_id,
        p.estado,
        p.total,
        d.id AS detalle_id,
        d.producto_id,
        d.cantidad,
        d.precio,
        d.notas,
        pr.nombre AS producto_nombre
      FROM pedidos p
      LEFT JOIN detalles_pedido d ON d.pedido_id = p.id
      LEFT JOIN productos pr ON pr.id = d.producto_id
      WHERE p.estado = $1
      ORDER BY p.id DESC
    `, [estado]);

    const pedidosMap = {};

    for (const row of result.rows) {
      if (!pedidosMap[row.id]) {
        pedidosMap[row.id] = {
          id: row.id,
          mesa_id: row.mesa_id,
          estado: row.estado,
          total: row.total,
          detalles: []
        };
      }

      if (row.detalle_id && row.producto_id) {
        pedidosMap[row.id].detalles.push({
          id: row.detalle_id,
          producto_id: row.producto_id,
          producto_nombre: row.producto_nombre,
          cantidad: row.cantidad,
          precio: row.precio,
          notas: row.notas
        });
      }
    }

    return Object.values(pedidosMap);
  }

  static async obtenerPorMesaConDetalles(mesa_id) {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.mesa_id,
        p.estado,
        p.total,
        d.id AS detalle_id,
        d.producto_id,
        d.cantidad,
        d.precio,
        d.notas,
        pr.nombre AS producto_nombre
      FROM pedidos p
      LEFT JOIN detalles_pedido d ON d.pedido_id = p.id
      LEFT JOIN productos pr ON pr.id = d.producto_id
      WHERE p.mesa_id = $1
      ORDER BY p.id DESC
    `, [mesa_id]);

    const pedidosMap = {};

    for (const row of result.rows) {
      if (!pedidosMap[row.id]) {
        pedidosMap[row.id] = {
          id: row.id,
          mesa_id: row.mesa_id,
          estado: row.estado,
          total: row.total,
          detalles: []
        };
      }

      if (row.detalle_id && row.producto_id) {
        pedidosMap[row.id].detalles.push({
          id: row.detalle_id,
          producto_id: row.producto_id,
          producto_nombre: row.producto_nombre,
          cantidad: row.cantidad,
          precio: row.precio,
          notas: row.notas
        });
      }
    }

    return Object.values(pedidosMap);
  }
}

module.exports = Pedido;