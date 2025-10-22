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
    const {
      nombre,
      unidad = 'g',
      stock_actual = 0,
      stock_minimo = 1
    } = req.body;

    const nuevo = {
      nombre,
      unidad,
      stock_actual,
      stock_minimo
    };

    const ingrediente = await Ingrediente.crear(nuevo);
    res.status(201).json(ingrediente);
  } catch (error) {
    console.error('❌ Error al crear ingrediente:', error);
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
      SELECT 
        mi.*,
        CASE 
          WHEN mi.tipo_inventario = 'ingrediente' THEN i.nombre 
          WHEN mi.tipo_inventario = 'producto_preparado' THEN 
            (SELECT pp.nombre FROM productos_preparados pp WHERE pp.id = p.producto_preparado_id)
        END as item_nombre
      FROM movimientos_inventario mi
      LEFT JOIN ingredientes i ON mi.ingrediente_id = i.id
      LEFT JOIN productos p ON mi.producto_id = p.id
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

// ... otros requires

exports.crearProductoPreparado = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      nombre,
      descripcion,
      unidad,
      stock_actual,
      stock_minimo,
      ingredientes
    } = req.body;

    // 🧩 Validaciones básicas
    if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
      throw new Error('La propiedad "ingredientes" debe ser un arreglo con al menos un ingrediente.');
    }

    // 1️⃣ Crear producto preparado
    const result = await client.query(
      `INSERT INTO productos_preparados (nombre, descripcion, unidad, stock_actual, stock_minimo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, stock_actual`,
      [nombre, descripcion, unidad, stock_actual || 0, stock_minimo]
    );

    const productoPreparadoId = result.rows[0].id;
    const stockProducto = parseFloat(result.rows[0].stock_actual || 0);

    // 2️⃣ Insertar los ingredientes en recetas
    for (const ing of ingredientes) {
      const ingredienteId = parseInt(ing.ingrediente_id);
      const cantidadPorUnidad = parseFloat(ing.cantidad);

      if (isNaN(ingredienteId) || isNaN(cantidadPorUnidad)) continue;

      await client.query(
        `INSERT INTO recetas (producto_preparado_id, ingrediente_id, cantidad)
         VALUES ($1, $2, $3)`,
        [productoPreparadoId, ingredienteId, cantidadPorUnidad]
      );

      // 3️⃣ Calcular descuento total = cantidadPorUnidad × stock_actual del producto
      const cantidadTotalDescontar = cantidadPorUnidad * stockProducto;

// 3️⃣ Descontar directamente la cantidad total indicada en la receta (ya representa todo el lote)
if (cantidadPorUnidad > 0) {
  // Verificar stock suficiente
  const stockRes = await client.query(
    'SELECT stock_actual, nombre FROM ingredientes WHERE id = $1',
    [ingredienteId]
  );

  if (stockRes.rows.length > 0) {
    const disponible = parseFloat(stockRes.rows[0].stock_actual);
    const nombreIngrediente = stockRes.rows[0].nombre;

    if (disponible < cantidadPorUnidad) {
      console.warn(`⚠️ Stock insuficiente de ${nombreIngrediente}. Disponible: ${disponible}, requerido: ${cantidadPorUnidad}`);
    }

    // 4️⃣ Actualizar stock del ingrediente
    await client.query(
      `UPDATE ingredientes
       SET stock_actual = stock_actual - $1
       WHERE id = $2`,
      [cantidadPorUnidad, ingredienteId]
    );
  }
}

    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Producto preparado creado correctamente.',
      producto_preparado_id: productoPreparadoId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear producto preparado:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
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
    console.log(`🔍 Buscando receta para producto_preparado ID: ${id}`);

    // Validar que el producto preparado existe
    const productoResult = await pool.query('SELECT * FROM productos_preparados WHERE id = $1', [id]);
    if (productoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Producto preparado no encontrado' });
    }

    const recetaResult = await pool.query(`
      SELECT 
        r.*,
        i.nombre as ingrediente_nombre,
        i.unidad as ingrediente_unidad
      FROM recetas r
      JOIN ingredientes i ON r.ingrediente_id = i.id
      WHERE r.producto_preparado_id = $1
    `, [id]);

    const receta = recetaResult.rows;

    console.log(`📤 Enviando receta:`, receta);
    res.json(receta);
  } catch (error) {
    console.error('❌ Error al obtener receta:', error);
    res.status(500).json({ error: 'Error interno al obtener la receta' });
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

    console.log('📦 Enviando body a backend:', { productoId, cantidad });

    await client.query('BEGIN');

    // 1️⃣ Obtener el producto preparado
    const prepResult = await client.query('SELECT * FROM productos_preparados WHERE id = $1', [productoId]);
    const productoPreparado = prepResult.rows[0];

    if (!productoPreparado) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Producto preparado no encontrado' });
    }

    // 2️⃣ Obtener la receta del producto preparado (buscando productos que lo referencien)
    const recetaResult = await client.query(`
      SELECT r.ingrediente_id, r.cantidad, i.stock_actual, i.nombre, i.unidad
      FROM recetas r
      JOIN ingredientes i ON i.id = r.ingrediente_id
      JOIN productos p ON p.id = r.producto_id
      WHERE p.producto_preparado_id = $1
    `, [productoId]);

    if (recetaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Este producto no tiene receta asociada' });
    }

    // 3️⃣ Verificar stock suficiente de ingredientes
    for (const item of recetaResult.rows) {
      const descontar = parseFloat(item.cantidad) * parseFloat(cantidad);

      if (parseFloat(item.stock_actual) < descontar) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Stock insuficiente de ${item.nombre}. Disponible: ${item.stock_actual} ${item.unidad}, Requiere: ${descontar} ${item.unidad}`
        });
      }
    }

    // 4️⃣ Descontar ingredientes
    for (const item of recetaResult.rows) {
      const descontar = parseFloat(item.cantidad) * parseFloat(cantidad);

      await client.query(`
        UPDATE ingredientes
        SET stock_actual = stock_actual - $1
        WHERE id = $2
      `, [descontar, item.ingrediente_id]);

      // Registrar movimiento de ingrediente
      await client.query(`
        INSERT INTO movimientos_inventario (tipo_inventario, ingrediente_id, tipo, cantidad, motivo, usuario_id)
        VALUES ('ingrediente', $1, 'salida', $2, 'Preparación automática de producto', 1)
      `, [item.ingrediente_id, descontar]);
    }

    // 5️⃣ Aumentar stock del producto preparado
    const updateProd = await client.query(`
      UPDATE productos_preparados
      SET stock_actual = stock_actual + $1,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING nombre, stock_actual
    `, [cantidad, productoId]);

    // 6️⃣ Registrar movimiento de producto preparado
    await client.query(`
      INSERT INTO movimientos_inventario (tipo_inventario, producto_id, tipo, cantidad, motivo, usuario_id)
      VALUES ('producto_preparado', $1, 'entrada', $2, 'Preparación automática de producto', 1)
    `, [productoId, cantidad]);

    await client.query('COMMIT');

    console.log('✅ Producto preparado actualizado:', updateProd.rows[0]);

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
