const pool = require('../config/db');
const Pedido = require('../models/Pedido');
const DetallePedido = require('../models/DetallePedido');

/* ------------------------------------------
   🔧 Helper para descontar stock según tipo
------------------------------------------- */
async function descontarStockProducto(client, producto_id, cantidad) {
  const { rows } = await client.query('SELECT * FROM productos WHERE id = $1', [producto_id]);
  const producto = rows[0];

  if (!producto) return;

  // 🧩 Si es tipo "preparado", descontar directamente del stock de productos_preparados
  if (producto.tipo_inventario === 'preparado') {
    // Verificar si hay un producto_preparado asociado
    if (!producto.producto_preparado_id) {
      throw new Error(`El producto ${producto.nombre} no tiene un producto preparado asociado`);
    }
    
    const prepResult = await client.query('SELECT * FROM productos_preparados WHERE id = $1', [producto.producto_preparado_id]);
    const productoPreparado = prepResult.rows[0];
    
    if (!productoPreparado) {
      throw new Error(`No se encontró el producto preparado con ID ${producto.producto_preparado_id}`);
    }
    
    if (productoPreparado.stock_actual < cantidad) {
      throw new Error(`Stock insuficiente de ${productoPreparado.nombre}. Disponible: ${productoPreparado.stock_actual}, Requerido: ${cantidad}`);
    }
    
    // Descontar stock del producto preparado
    await client.query(`
      UPDATE productos_preparados
      SET stock_actual = stock_actual - $1,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [cantidad, producto.producto_preparado_id]);

  // 🥩 Si es tipo "general", buscar su receta y descontar de ingredientes
  } else if (producto.tipo_inventario === 'general') {
    const receta = await client.query(`
      SELECT ingrediente_id, cantidad
      FROM recetas
      WHERE producto_id = $1
    `, [producto_id]);

    if (receta.rows.length === 0) {
      throw new Error(`El producto ${producto.nombre} no tiene una receta definida`);
    }

    for (const r of receta.rows) {
      // 🔧 Convertimos a número para evitar el error "unknown * unknown"
      const cantidadIngrediente = parseFloat(r.cantidad);
      const cantidadPedida = parseFloat(cantidad);
      const requerido = cantidadIngrediente * cantidadPedida;

      // Verificar stock de ingrediente
      const ingResult = await client.query('SELECT * FROM ingredientes WHERE id = $1', [r.ingrediente_id]);
      const ingrediente = ingResult.rows[0];
      
      if (!ingrediente) {
        throw new Error(`No se encontró el ingrediente con ID ${r.ingrediente_id}`);
      }
      
      if (ingrediente.stock_actual < requerido) {
        throw new Error(`Stock insuficiente de ${ingrediente.nombre}. Disponible: ${ingrediente.stock_actual}, Requerido: ${requerido}`);
      }

      // Descontar stock del ingrediente
      await client.query(`
        UPDATE ingredientes
        SET stock_actual = stock_actual - $1
        WHERE id = $2
      `, [requerido, r.ingrediente_id]);
    }
  }
}
async function devolverStockProducto(client, producto_id, cantidad) {
  const { rows } = await client.query('SELECT * FROM productos WHERE id = $1', [producto_id]);
  const producto = rows[0];

  if (!producto) return;

  if (producto.tipo_inventario === 'preparado') {
    await client.query(`
      UPDATE productos_preparados
      SET stock_actual = stock_actual + $1
      WHERE id = $2
    `, [cantidad, producto.producto_preparado_id]);

  } else if (producto.tipo_inventario === 'general') {
    const receta = await client.query(`
      SELECT ingrediente_id, cantidad
      FROM recetas
      WHERE producto_id = $1
    `, [producto_id]);

    for (const r of receta.rows) {
      const devolver = parseFloat(r.cantidad) * cantidad;

      await client.query(`
        UPDATE ingredientes
        SET stock_actual = stock_actual + $1
        WHERE id = $2
      `, [devolver, r.ingrediente_id]);
    }
  }
}


/* ------------------------------------------
   🔹 Obtener todos los pedidos
------------------------------------------- */
exports.obtenerPedidos = async (req, res) => {
  try {
    const pedidos = await Pedido.obtenerTodosConDetalles();
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Obtener pedido individual
------------------------------------------- */
exports.obtenerPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Pedido.obtenerPorIdConDetalles(id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Crear pedido (DESCUENTA STOCK)
------------------------------------------- */
exports.crearPedido = async (req, res) => {
  const client = await pool.connect();
  try {
    const { mesa_id, usuario_id, items } = req.body;
const detalles = items;

    const pedidoExistente = await pool.query(
      `SELECT * FROM pedidos 
       WHERE mesa_id = $1 
       AND estado IN ('pendiente','confirmado','preparando')`,
      [mesa_id]
    );

    if (pedidoExistente.rows.length > 0) {
      throw new Error('La mesa ya está ocupada o reservada.');
    }
    await client.query('BEGIN');


    // 🚀 Crear pedido inicial
    const pedidoResult = await client.query(
      `INSERT INTO pedidos (mesa_id, usuario_id, estado, total, fecha_creacion)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [mesa_id, usuario_id, 'preparando', 0]
    );
    const pedido = pedidoResult.rows[0];
    let total = 0;

    // Crear cada detalle y descontar stock
    for (const detalle of detalles) {
      await client.query(
        `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, notas, precio, estado)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [pedido.id, detalle.producto_id, detalle.cantidad, detalle.notas, detalle.precio, 'pendiente']
      );

      total += detalle.precio * detalle.cantidad;

      // ⚙️ Descontar del inventario según tipo
      await descontarStockProducto(client, detalle.producto_id);
    }

    await client.query(`UPDATE pedidos SET total = $1 WHERE id = $2`, [total, pedido.id]);
    await client.query('COMMIT');

    const pedidoCompleto = await Pedido.obtenerPorIdConDetalles(pedido.id);
    if (req.io) req.io.emit('pedidoCreado', pedidoCompleto);

    res.status(201).json(pedidoCompleto);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al crear pedido:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

/* ------------------------------------------
   🔹 Actualizar pedido
------------------------------------------- */
exports.actualizarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { mesa_id, usuario_id, estado, total } = req.body;

    await Pedido.actualizar(id, { mesa_id, usuario_id, estado, total });
    const pedidoCompleto = await Pedido.obtenerPorIdConDetalles(id);

    if (req.io) req.io.emit('pedidoActualizado', pedidoCompleto);
    res.json(pedidoCompleto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Eliminar pedido
------------------------------------------- */
exports.eliminarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    await Pedido.eliminar(id);
    if (req.io) req.io.emit('pedidoEliminado', { id: Number(id) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Obtener pedidos por mesa
------------------------------------------- */
exports.obtenerPedidosPorMesa = async (req, res) => {
  try {
    const { mesa_id } = req.params;

    console.log("📥 Mesa ID:", mesa_id);

    const pedidos = await Pedido.obtenerPorMesaConDetalles(Number(mesa_id));

    res.json(pedidos);

  } catch (error) {
    console.error("💥 ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Obtener pedidos por estado
------------------------------------------- */
exports.obtenerPedidosPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    const pedidos = await Pedido.obtenerPorEstadoConDetalles(estado);
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Actualizar estado de pedido
------------------------------------------- */
exports.actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    let total = null;

    // 🔥 SOLO cuando se entrega el pedido
    if (estado === 'entregado') {
      const result = await require('../config/db').query(`
        SELECT 
          COALESCE(SUM(cantidad * precio), 0) as total
        FROM detalles_pedido
        WHERE pedido_id = $1
      `, [id]);

      total = result.rows[0].total;
    }

    // 🔥 actualizar pedido
    await Pedido.actualizar(id, {
      estado,
      ...(total !== null && { total })
    });

    const pedidoCompleto = await Pedido.obtenerPorIdConDetalles(id);

    if (req.io) req.io.emit('pedidoActualizado', pedidoCompleto);

    res.json(pedidoCompleto);

  } catch (error) {
    console.error("❌ ERROR actualizarEstadoPedido:", error);
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Actualizar detalles de un pedido (editar cantidades/agregar/eliminar)
------------------------------------------- */
exports.actualizarDetallesPedido = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const nuevosDetalles = req.body.detalles; // lista completa desde frontend

    await client.query("BEGIN");

    // Obtener detalles actuales
    const detallesActuales = await DetallePedido.obtenerPorPedido(id);

    // Mapa para manejar diferencias
    const actualesMap = new Map(detallesActuales.map(d => [d.producto_id, d]));
    const nuevosMap = new Map(nuevosDetalles.map(d => [d.producto_id, d]));

    // 1. Eliminar productos que ya no están
    for (const [producto_id, det] of actualesMap.entries()) {
      if (!nuevosMap.has(producto_id)) {
        // devolver stock
        await devolverStockProducto(client, producto_id, det.cantidad);
        await client.query(`DELETE FROM detalles_pedido WHERE id = $1`, [det.id]);
      }
    }

    // 2. Actualizar productos existentes
    for (const det of nuevosDetalles) {
      const actual = actualesMap.get(det.producto_id);

      if (actual) {
        const diferencia = det.cantidad - actual.cantidad;

        if (diferencia > 0) {
          await descontarStockProducto(client, det.producto_id, diferencia);
        } else if (diferencia < 0) {
          await devolverStockProducto(client, det.producto_id, Math.abs(diferencia));
        }

        await client.query(
          `UPDATE detalles_pedido 
           SET cantidad = $1, notas = $2, precio = $3 
           WHERE id = $4`,
          [det.cantidad, det.notas, det.precio, actual.id]
        );
      }
    }

    // 3. Agregar productos nuevos
    for (const det of nuevosDetalles) {
      if (!actualesMap.has(det.producto_id)) {
        await descontarStockProducto(client, det.producto_id, det.cantidad);

        await client.query(
          `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, notas, precio)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, det.producto_id, det.cantidad, det.notas, det.precio]
        );
      }
    }

    // 4. Recalcular total
    const total = nuevosDetalles.reduce((acc, d) => acc + d.precio * d.cantidad, 0);
    await client.query(`UPDATE pedidos SET total = $1 WHERE id = $2`, [total, id]);

    await client.query("COMMIT");

    const pedidoActualizado = await Pedido.obtenerPorIdConDetalles(id);

    if (req.io) req.io.emit("pedidoActualizado", pedidoActualizado);
    res.json(pedidoActualizado);

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error actualizando detalles:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

/* ------------------------------------------
   🔹 Editar pedido
------------------------------------------- */
exports.editarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { detalles } = req.body;

    let total = 0;
    for (const detalle of detalles) {
      await DetallePedido.crear({
        pedido_id: id,
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        notas: detalle.notas,
        precio: detalle.precio,
      });
      total += detalle.precio * detalle.cantidad;
    }

    const pedidoActualizado = await Pedido.obtenerPorIdConDetalles(id);
    if (req.io) req.io.emit('pedidoActualizado', pedidoActualizado);

    res.json(pedidoActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Liberar mesa
------------------------------------------- */
exports.liberarMesa = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Pedido.actualizar(id, { estado: 'cerrado' });
    if (req.io) req.io.emit('pedidoEliminado', { id: Number(id) });
    res.json({ success: true, pedido });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
