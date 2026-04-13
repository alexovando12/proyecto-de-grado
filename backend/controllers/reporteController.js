const pool = require("../config/db");

// 🔥 VENTAS
exports.generarReporteVentas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const params = [];
    const where = ["p.estado IN ('entregado', 'cerrado')"];

    if (fechaInicio) {
      params.push(fechaInicio);
      where.push(`DATE(p.fecha_creacion) >= $${params.length}`);
    }

    if (fechaFin) {
      params.push(fechaFin);
      where.push(`DATE(p.fecha_creacion) <= $${params.length}`);
    }

    const result = await pool.query(
      `
      SELECT 
        DATE(p.fecha_creacion) as fecha,
        COUNT(p.id)::int as total_pedidos,
        COALESCE(SUM(p.total), 0)::numeric(12,2) as total_ventas,
        COALESCE(AVG(p.total), 0)::numeric(12,2) as ticket_promedio
      FROM pedidos p
      WHERE ${where.join(" AND ")}
      GROUP BY DATE(p.fecha_creacion)
      ORDER BY DATE(p.fecha_creacion) DESC
    `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ ventas:", error);
    res.status(500).json({ error: "Error ventas" });
  }
};

// 🔥 PRODUCTOS POPULARES (ARREGLADO)
exports.generarReporteProductosPopulares = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.nombre,
        COUNT(*) as veces_pedido,
        COALESCE(SUM(dp.cantidad), 0) as total_unidades,
        COALESCE(SUM(dp.cantidad * dp.precio), 0) as total_ventas
      FROM detalles_pedido dp
      INNER JOIN productos p ON dp.producto_id = p.id
      GROUP BY p.nombre
      ORDER BY total_unidades DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ ERROR PRODUCTOS:", error);
    res.status(500).json({ error: "Error productos populares" });
  }
};

// 🔥 INVENTARIO (SEGURO)
exports.generarReporteInventario = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        nombre,
        unidad,
        stock_actual,
        stock_minimo,
        CASE 
          WHEN stock_actual <= 0 THEN 'CRITICO'
          WHEN stock_actual <= stock_minimo THEN 'BAJO'
          ELSE 'NORMAL'
        END as estado
      FROM ingredientes
      ORDER BY nombre
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ inventario:", error);
    res.status(500).json({ error: "Error inventario" });
  }
};

// 🔥 MOVIMIENTOS (ARREGLADO)
exports.generarReporteMovimientos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        mi.fecha_creacion as fecha,
        mi.tipo,
        COUNT(mi.id) as total_movimientos,
        COALESCE(SUM(mi.cantidad), 0) as total_cantidad,
        0 as valor_economico
      FROM movimientos_inventario mi
      GROUP BY mi.fecha_creacion, mi.tipo
      ORDER BY mi.fecha_creacion DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ ERROR MOVIMIENTOS:", error);
    res.status(500).json({ error: "Error movimientos" });
  }
};

// 🔥 DETALLE PEDIDOS (ARREGLADO)
exports.generarReporteDetallePedidos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ped.id as pedido_id,
        ped.mesa_id,
        ped.fecha_creacion as fecha,
        p.nombre as producto,
        COALESCE(dp.cantidad, 0) as cantidad,
        COALESCE(dp.precio, 0) as precio,
        COALESCE(dp.cantidad * dp.precio, 0) as total
      FROM pedidos ped
      INNER JOIN detalles_pedido dp ON ped.id = dp.pedido_id
      INNER JOIN productos p ON dp.producto_id = p.id
      ORDER BY ped.fecha_creacion DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ ERROR DETALLE:", error);
    res.status(500).json({ error: "Error detalle pedidos" });
  }
};
