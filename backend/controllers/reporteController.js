const pool = require('../config/db');

exports.generarReporteVentas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    const result = await pool.query(`
      SELECT 
        DATE(p.fecha_creacion) as fecha,
        COUNT(p.id) as total_pedidos,
        SUM(p.total) as total_ventas,
        AVG(p.total) as ticket_promedio
      FROM pedidos p
      WHERE p.fecha_creacion BETWEEN $1 AND $2
        AND p.estado = 'entregado'
      GROUP BY DATE(p.fecha_creacion)
      ORDER BY fecha DESC
    `, [fechaInicio, fechaFin]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generarReporteProductosPopulares = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    const result = await pool.query(`
      SELECT 
        p.nombre,
        COUNT(di.id) as veces_pedido,
        SUM(di.cantidad) as total_unidades,
        SUM(di.cantidad * di.precio) as total_ventas
      FROM productos p
      JOIN detalles_pedido di ON p.id = di.producto_id
      JOIN pedidos ped ON di.pedido_id = ped.id
      WHERE ped.fecha_creacion BETWEEN $1 AND $2
        AND ped.estado = 'entregado'
      GROUP BY p.id, p.nombre
      ORDER BY total_unidades DESC
      LIMIT 10
    `, [fechaInicio, fechaFin]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generarReporteInventario = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.nombre,
        i.unidad,
        i.stock_actual,
        i.stock_minimo,
        i.costo_por_unidad,
        (i.stock_actual * i.costo_por_unidad) as valor_total,
        CASE 
          WHEN i.stock_actual <= 0 THEN 'CRITICO'
          WHEN i.stock_actual <= i.stock_minimo THEN 'BAJO'
          ELSE 'NORMAL'
        END as estado
      FROM ingredientes i
      ORDER BY 
        CASE 
          WHEN i.stock_actual <= 0 THEN 1
          WHEN i.stock_actual <= i.stock_minimo THEN 2
          ELSE 3
        END,
        i.nombre
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generarReporteMovimientos = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    const result = await pool.query(`
      SELECT 
        DATE(mi.fecha_creacion) as fecha,
        mi.tipo,
        COUNT(mi.id) as total_movimientos,
        SUM(mi.cantidad) as total_cantidad,
        SUM(
          CASE 
            WHEN mi.tipo = 'entrada' THEN mi.cantidad * i.costo_por_unidad
            ELSE -mi.cantidad * i.costo_por_unidad
          END
        ) as valor_economico
      FROM movimientos_inventario mi
      JOIN ingredientes i ON mi.ingrediente_id = i.id
      WHERE mi.fecha_creacion BETWEEN $1 AND $2
      GROUP BY DATE(mi.fecha_creacion), mi.tipo
      ORDER BY fecha DESC, mi.tipo
    `, [fechaInicio, fechaFin]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};