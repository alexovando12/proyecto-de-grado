const pool = require('../config/db');
const Ingrediente = require('../models/Ingrediente');
const ProductoPreparado = require('../models/ProductoPreparado');
const Receta = require('../models/Receta');
const MovimientoInventario = require('../models/MovimientoInventario');

// =========================
// CRUD de Ingredientes
// =========================
exports.crearIngrediente = async (req, res) => {
  try {
    const ingrediente = await Ingrediente.crear(req.body);
    res.status(201).json(ingrediente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.actualizarIngrediente = async (req, res) => {
  try {
    const { id } = req.params;
    const ingrediente = await Ingrediente.actualizar(id, req.body);
    res.json(ingrediente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.eliminarIngrediente = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Ingrediente.eliminar(id);
    if (result) {
      res.json({ success: true, message: 'Ingrediente eliminado correctamente' });
    } else {
      res.status(404).json({ error: 'Ingrediente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerIngredientes = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredientes WHERE activo = true ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener ingredientes:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerStockBajo = async (req, res) => {
  try {
    const stockBajo = await Ingrediente.obtenerBajoStock();
    res.json(stockBajo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =========================
// Movimientos de Inventario
// =========================
exports.registrarMovimiento = async (req, res) => {
  try {
    const { ingrediente_id, tipo, cantidad, motivo, pedido_id } = req.body;
    const usuario_id = req.usuario.id;
    await Ingrediente.actualizarStock(ingrediente_id, cantidad, tipo);

    const movimiento = await MovimientoInventario.crear({
      ingrediente_id,
      tipo,
      cantidad,
      motivo,
      pedido_id,
      usuario_id
    });

    res.status(201).json(movimiento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerMovimientos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mi.*, 
             CASE 
                 WHEN mi.tipo_inventario = 'ingrediente' THEN i.nombre 
                 WHEN mi.tipo_inventario = 'producto_preparado' THEN pp.nombre 
             END as item_nombre
      FROM movimientos_inventario mi
      LEFT JOIN ingredientes i ON mi.tipo_inventario = 'ingrediente' AND mi.item_id = i.id
      LEFT JOIN productos_preparados pp ON mi.tipo_inventario = 'producto_preparado' AND mi.item_id = pp.id
      ORDER BY mi.fecha_creacion DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// Productos Preparados
// =========================
exports.obtenerProductosPreparados = async (req, res) => {
  try {
    const productos = await ProductoPreparado.obtenerTodos();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crearProductoPreparado = async (req, res) => {
  try {
    const { nombre, descripcion, unidad, stock_actual, stock_minimo } = req.body;

    const result = await pool.query(
      `INSERT INTO productos_preparados (nombre, descripcion, unidad, stock_actual, stock_minimo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre, descripcion, unidad, stock_actual, stock_minimo]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear producto preparado:', error);
    res.status(500).json({ error: 'Error al crear producto preparado' });
  }
};

exports.actualizarProductoPreparado = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await ProductoPreparado.actualizar(id, req.body);
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.eliminarProductoPreparado = async (req, res) => {
  try {
    const { id } = req.params;
    await Receta.eliminarPorProducto(id);
    const producto = await ProductoPreparado.eliminar(id);
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =========================
// Recetas
// =========================
exports.obtenerReceta = async (req, res) => {
  try {
    const { id } = req.params;
    const receta = await Receta.obtenerPorProducto(id);
    res.json(receta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.agregarIngredienteAReceta = async (req, res) => {
  try {
    const { id } = req.params;
    const { ingrediente_id, cantidad } = req.body;

    console.log('🧾 Guardando receta:', { producto_preparado_id: id, ingrediente_id, cantidad });

    const detalle = await Receta.agregarIngrediente(id, ingrediente_id, cantidad);
    res.status(201).json(detalle);
  } catch (error) {
    console.error('❌ Error al agregar ingrediente a receta:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.eliminarRecetaPorProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Receta.eliminarPorProducto(id);
    res.json({ message: `Receta eliminada (${result} filas eliminadas)` });
  } catch (error) {
    console.error('Error al eliminar receta:', error);
    res.status(500).json({ error: 'Error al eliminar receta' });
  }
};

// =========================
// Preparar producto
// =========================
exports.prepararProducto = async (req, res) => {
  const client = await pool.connect();
  try {
    const { productoId, cantidad } = req.body;

    if (!productoId || isNaN(cantidad) || cantidad <= 0) {
      return res.status(400).json({ error: 'productoId y cantidad válidos son requeridos' });
    }

    console.log('📨 Body recibido en /preparar:', req.body);

    await client.query('BEGIN');

    // 1️⃣ Obtener receta
    const recetaResult = await client.query(`
      SELECT r.ingrediente_id, r.cantidad, i.stock_actual, i.nombre
      FROM recetas r
      JOIN ingredientes i ON i.id = r.ingrediente_id
      WHERE r.producto_preparado_id = $1
    `, [productoId]);

    if (recetaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '❌ Este producto no tiene receta asociada.' });
    }

    // 2️⃣ Verificar stock suficiente (sin multiplicar)
    for (const item of recetaResult.rows) {
      const descontar = parseFloat(item.cantidad);

      if (isNaN(descontar)) throw new Error(`Cantidad inválida para ${item.nombre}`);

      if (parseFloat(item.stock_actual) < descontar) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Stock insuficiente de ${item.nombre}. Disponible: ${item.stock_actual}, Requiere: ${descontar}`
        });
      }
    }

    // 3️⃣ Descontar ingredientes (sin multiplicar)
    for (const item of recetaResult.rows) {
      const descontar = parseFloat(item.cantidad);

      const updateIng = await client.query(`
        UPDATE ingredientes
        SET stock_actual = stock_actual - $1
        WHERE id = $2
        RETURNING nombre, stock_actual
      `, [descontar, item.ingrediente_id]);

      console.log(`🧂 Ingrediente descontado:`, updateIng.rows[0]);

      await client.query(`
        INSERT INTO movimientos_inventario (tipo_inventario, item_id, tipo, cantidad, motivo, usuario_id)
        VALUES ('ingrediente', $1, 'salida', $2, 'Preparación automática de producto', 1)
      `, [item.ingrediente_id, descontar]);
    }

    // 4️⃣ Aumentar stock del producto preparado (sí aumenta según cantidad indicada)
    const updateProd = await client.query(`
      UPDATE productos_preparados
      SET stock_actual = stock_actual + $1
      WHERE id = $2
      RETURNING nombre, stock_actual
    `, [cantidad, productoId]);

    console.log('🍳 Producto preparado actualizado:', updateProd.rows[0]);

    await client.query(`
      INSERT INTO movimientos_inventario (tipo_inventario, item_id, tipo, cantidad, motivo, usuario_id)
      VALUES ('producto_preparado', $1, 'entrada', $2, 'Preparación automática de producto', 1)
    `, [productoId, cantidad]);

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: '✅ Producto preparado y actualizado correctamente',
      producto: updateProd.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error preparando producto:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// =========================
// Venta de productos
// =========================
exports.venderProductoPreparado = async (req, res) => {
  try {
    const { productoId, cantidad } = req.body;
    const usuario_id = req.usuario.id;

    const producto = await ProductoPreparado.obtenerPorId(productoId);
    if (!producto) throw new Error('Producto no encontrado');
    if (producto.stock_actual < cantidad)
      throw new Error(`Stock insuficiente. Disponible: ${producto.stock_actual} ${producto.unidad}`);

    await ProductoPreparado.actualizarStock(productoId, cantidad, 'salida');

    await MovimientoInventario.crear({
      tipo_inventario: 'producto_preparado',
      item_id: productoId,
      tipo: 'salida',
      cantidad,
      motivo: 'Venta',
      usuario_id
    });

    res.json({ success: true, message: 'Venta registrada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// =========================
// Venta directa (ingredientes)
// =========================
exports.venderPlatoDirecto = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { ingredientes } = req.body;
    const usuario_id = req.usuario.id;

    const verificacion = await Ingrediente.verificarStock(ingredientes);
    const insuficientes = verificacion.filter(item => !item.suficiente);

    if (insuficientes.length > 0) {
      const mensajeError = insuficientes.map(item =>
        `Stock insuficiente para ${item.ingrediente}. Necesario: ${item.necesario} ${item.unidad}, Disponible: ${item.disponible} ${item.unidad}`
      ).join('. ');
      throw new Error(mensajeError);
    }

    for (const item of ingredientes) {
      await Ingrediente.actualizarStock(item.ingrediente_id, item.cantidad, 'salida');

      await MovimientoInventario.crear({
        tipo_inventario: 'ingrediente',
        item_id: item.ingrediente_id,
        tipo: 'salida',
        cantidad: item.cantidad,
        motivo: 'Venta directa',
        usuario_id
      });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Venta registrada correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// =========================
// Alertas de stock bajo
// =========================
exports.obtenerAlertasStock = async (req, res) => {
  try {
    const [ingredientesBajo, productosBajo] = await Promise.all([
      pool.query('SELECT * FROM ingredientes WHERE stock_actual <= stock_minimo AND activo = true ORDER BY stock_actual ASC'),
      pool.query('SELECT * FROM productos_preparados WHERE stock_actual <= stock_minimo ORDER BY stock_actual ASC')
    ]);

    res.json({
      ingredientes: ingredientesBajo.rows,
      productosPreparados: productosBajo.rows
    });
  } catch (error) {
    console.error('Error al obtener alertas de stock:', error);
    res.status(500).json({ error: error.message });
  }
};
