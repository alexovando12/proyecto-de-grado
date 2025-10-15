const pool = require('../config/db');

class Reporte {
  static async ventasDiarias(fecha) {
    const result = await pool.query(`
      SELECT 
        DATE(p.fecha_creacion) as fecha,
        COUNT(*) as total_pedidos,
        COALESCE(SUM(p.total), 0) as total_ventas
      FROM pedidos p
      WHERE DATE(p.fecha_creacion) = $1
      GROUP BY DATE(p.fecha_creacion)
      ORDER BY DATE(p.fecha_creacion)
    `, [fecha]);
    return result.rows;
  }

  static async productosPopulares() {
    const result = await pool.query(`
      SELECT 
        pi.producto_id,
        p.nombre as producto_nombre,
        COUNT(*) as veces_pedido,
        SUM(pi.cantidad) as total_unidades,
        COALESCE(SUM(pi.cantidad * pi.precio), 0) as total_ingresos
      FROM detalles_pedido pi
      JOIN productos p ON pi.producto_id = p.id
      JOIN pedidos ped ON pi.pedido_id = ped.id
      WHERE ped.estado NOT IN ('cancelado')
      GROUP BY pi.producto_id, p.nombre
      ORDER BY total_unidades DESC
      LIMIT 10
    `);
    return result.rows;
  }

  static async ventasPorMozo() {
    const result = await pool.query(`
      SELECT 
        u.nombre as mozo_nombre,
        COUNT(p.id) as total_pedidos,
        COALESCE(SUM(p.total), 0) as total_ventas
      FROM pedidos p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.estado NOT IN ('cancelado')
      GROUP BY u.id, u.nombre
      ORDER BY total_ventas DESC
    `);
    return result.rows;
  }

  static async estadoInventario() {
    const result = await pool.query(`
      SELECT 
        i.id,
        i.stock_actual,
        i.stock_minimo,
        p.nombre as producto_nombre,
        p.unidad,
        CASE 
          WHEN i.stock_actual <= 0 THEN 'agotado'
          WHEN i.stock_actual <= i.stock_minimo THEN 'bajo'
          ELSE 'normal'
        END as estado
      FROM inventario i
      JOIN productos p ON i.producto_id = p.id
      ORDER BY 
        CASE 
          WHEN i.stock_actual <= 0 THEN 1
          WHEN i.stock_actual <= i.stock_minimo THEN 2
          ELSE 3
        END
    `);
    return result.rows;
  }
}

module.exports = Reporte;