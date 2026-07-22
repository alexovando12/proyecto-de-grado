const pool = require("../config/db");
const Pedido = require("../models/Pedido");
const DetallePedido = require("../models/DetallePedido");

const normalizarUnidad = (unidad = "") =>
  String(unidad || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const esUnidadEntera = (unidad = "") => {
  const u = normalizarUnidad(unidad);
  return (
    u === "unidad" || u === "unidades" || u === "porcion" || u === "porciones"
  );
};

async function obtenerRecetaGeneral(client, producto_id) {
  const receta = await client.query(
    `SELECT r.ingrediente_id, r.cantidad, i.nombre AS ingrediente_nombre, i.unidad AS ingrediente_unidad
     FROM recetas r
     JOIN ingredientes i ON i.id = r.ingrediente_id
     WHERE r.producto_id = $1`,
    [producto_id],
  );

  return receta.rows;
}

function normalizarIngredientesAjustes(ingredientes_ajustes, receta = []) {
  if (!Array.isArray(ingredientes_ajustes)) return [];

  const recetaMap = new Map(
    (Array.isArray(receta) ? receta : []).map((item) => [
      Number(item.ingrediente_id),
      {
        base: Number(item.cantidad),
        nombre: item.ingrediente_nombre,
        unidad: item.ingrediente_unidad,
      },
    ]),
  );

  const ajustesMap = new Map();

  for (const item of ingredientes_ajustes) {
    const ingredienteId = Number(
      item?.ingrediente_id ?? item?.id ?? item?.ingredienteId,
    );
    const reducir = Number(
      item?.cantidad_reducida ?? item?.reducir ?? item?.cantidad ?? 0,
    );

    if (!Number.isFinite(ingredienteId) || ingredienteId <= 0) continue;
    if (!Number.isFinite(reducir) || reducir < 0) {
      throw new Error("Cantidad reducida inválida para ingredientes");
    }

    const recetaItem = recetaMap.get(ingredienteId);
    if (!recetaItem) {
      throw new Error(
        "Un ingrediente ajustado no pertenece a la receta del producto",
      );
    }

    if (esUnidadEntera(recetaItem.unidad) && !Number.isInteger(reducir)) {
      throw new Error(
        `La reducción del ingrediente ${recetaItem.nombre} debe ser entera por su unidad`,
      );
    }

    if (reducir > recetaItem.base) {
      throw new Error(
        `No puedes reducir más de lo que usa la receta para ${recetaItem.nombre}`,
      );
    }

    if (reducir === 0) continue;

    ajustesMap.set(ingredienteId, {
      ingrediente_id: ingredienteId,
      ingrediente_nombre: recetaItem.nombre,
      ingrediente_unidad: recetaItem.unidad,
      cantidad_base: Number(recetaItem.base),
      cantidad_actual:
        Number.isFinite(Number(item?.cantidad_actual)) &&
        Number(item.cantidad_actual) >= 0
          ? Number(item.cantidad_actual)
          : Number(recetaItem.base - reducir),
      cantidad_reducida: reducir,
    });
  }

  return [...ajustesMap.values()];
}

function construirClaveDetalle(producto_id, ingredientes_ajustes = []) {
  const ajustes = (
    Array.isArray(ingredientes_ajustes) ? ingredientes_ajustes : []
  )
    .map((a) => ({
      ingrediente_id: Number(a?.ingrediente_id ?? a?.id ?? a?.ingredienteId),
      cantidad_reducida: Number(
        a?.cantidad_reducida ?? a?.reducir ?? a?.cantidad ?? 0,
      ),
    }))
    .filter((a) => Number.isFinite(a.ingrediente_id) && a.ingrediente_id > 0)
    .sort((a, b) => a.ingrediente_id - b.ingrediente_id);
  return `${Number(producto_id)}|${JSON.stringify(
    ajustes.map((a) => [a.ingrediente_id, a.cantidad_reducida]),
  )}`;
}

/* ------------------------------------------
   🔧 Helper para descontar stock según tipo
------------------------------------------- */
async function descontarStockProducto(
  client,
  producto_id,
  cantidad,
  ingredientes_ajustes = [],
) {
  const { rows } = await client.query("SELECT * FROM productos WHERE id = $1", [
    producto_id,
  ]);
  const producto = rows[0];

  if (!producto) return;

  // 🧩 Si es tipo "preparado", descontar directamente del stock de productos_preparados
  if (producto.tipo_inventario === "preparado") {
    // Verificar si hay un producto_preparado asociado
    if (!producto.producto_preparado_id) {
      throw new Error(
        `El producto ${producto.nombre} no tiene un producto preparado asociado`,
      );
    }

    const prepResult = await client.query(
      "SELECT * FROM productos_preparados WHERE id = $1",
      [producto.producto_preparado_id],
    );
    const productoPreparado = prepResult.rows[0];

    if (!productoPreparado) {
      throw new Error(
        `No se encontró el producto preparado con ID ${producto.producto_preparado_id}`,
      );
    }

    if (productoPreparado.stock_actual < cantidad) {
      throw new Error(
        `Stock insuficiente de ${productoPreparado.nombre}. Disponible: ${productoPreparado.stock_actual}, Requerido: ${cantidad}`,
      );
    }

    // Descontar stock del producto preparado
    await client.query(
      `
      UPDATE productos_preparados
      SET stock_actual = stock_actual - $1,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [cantidad, producto.producto_preparado_id],
    );

    // 🥩 Si es tipo "general", buscar su receta y descontar de ingredientes
  } else if (producto.tipo_inventario === "general") {
    const recetaRows = await obtenerRecetaGeneral(client, producto_id);

    if (recetaRows.length === 0) {
      throw new Error(
        `El producto ${producto.nombre} no tiene una receta definida`,
      );
    }

    const ajustes = normalizarIngredientesAjustes(
      ingredientes_ajustes,
      recetaRows,
    );
    const ajustesMap = new Map(
      ajustes.map((a) => [Number(a.ingrediente_id), a]),
    );

    for (const r of recetaRows) {
      // 🔧 Convertimos a número para evitar el error "unknown * unknown"
      const cantidadIngrediente = parseFloat(r.cantidad);
      const cantidadPedida = parseFloat(cantidad);
      const ajuste = ajustesMap.get(Number(r.ingrediente_id));
      const cantidadReducida = Number(ajuste?.cantidad_reducida || 0);
      const cantidadActual = Number(ajuste?.cantidad_actual);
      const baseUnit = Number.isFinite(cantidadActual)
        ? cantidadActual
        : Number(cantidadIngrediente - cantidadReducida);
      const requerido = baseUnit * cantidadPedida;

      if (baseUnit < 0) {
        throw new Error("La reducción supera la cantidad base de la receta");
      }

      if (requerido <= 0) {
        continue;
      }

      // Verificar stock de ingrediente
      const ingResult = await client.query(
        "SELECT * FROM ingredientes WHERE id = $1",
        [r.ingrediente_id],
      );
      const ingrediente = ingResult.rows[0];

      if (!ingrediente) {
        throw new Error(
          `No se encontró el ingrediente con ID ${r.ingrediente_id}`,
        );
      }

      if (ingrediente.stock_actual < requerido) {
        throw new Error(
          `Stock insuficiente de ${ingrediente.nombre}. Disponible: ${ingrediente.stock_actual}, Requerido: ${requerido}`,
        );
      }

      // Descontar stock del ingrediente
      await client.query(
        `
        UPDATE ingredientes
        SET stock_actual = stock_actual - $1
        WHERE id = $2
      `,
        [requerido, r.ingrediente_id],
      );
    }
  }
}
async function devolverStockProducto(
  client,
  producto_id,
  cantidad,
  ingredientes_ajustes = [],
) {
  const { rows } = await client.query("SELECT * FROM productos WHERE id = $1", [
    producto_id,
  ]);
  const producto = rows[0];

  if (!producto) return;

  if (producto.tipo_inventario === "preparado") {
    await client.query(
      `
      UPDATE productos_preparados
      SET stock_actual = stock_actual + $1
      WHERE id = $2
    `,
      [cantidad, producto.producto_preparado_id],
    );
  } else if (producto.tipo_inventario === "general") {
    const recetaRows = await obtenerRecetaGeneral(client, producto_id);
    const ajustes = normalizarIngredientesAjustes(
      ingredientes_ajustes,
      recetaRows,
    );
    const ajustesMap = new Map(
      ajustes.map((a) => [Number(a.ingrediente_id), a]),
    );

    for (const r of recetaRows) {
      const ajuste = ajustesMap.get(Number(r.ingrediente_id));
      const cantidadReducida = Number(ajuste?.cantidad_reducida || 0);
      const cantidadActual = Number(ajuste?.cantidad_actual);
      const baseUnit = Number.isFinite(cantidadActual)
        ? cantidadActual
        : Number(parseFloat(r.cantidad) - cantidadReducida);
      const devolver = baseUnit * cantidad;

      if (devolver <= 0) continue;

      await client.query(
        `
        UPDATE ingredientes
        SET stock_actual = stock_actual + $1
        WHERE id = $2
      `,
        [devolver, r.ingrediente_id],
      );
    }
  }
}

/* ------------------------------------------
   🔹 Obtener todos los pedidos
------------------------------------------- */
exports.obtenerPedidos = async (req, res) => {
  try {
    const { fecha } = req.query;

    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res
        .status(400)
        .json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD" });
    }

    const pedidos = await Pedido.obtenerTodosConDetalles({ fecha });
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
    if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
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
    const { mesa_id, usuario_id, detalles } = req.body;

    const mesaId = Number(mesa_id);
    const usuarioIdBody = Number(usuario_id);
    const usuarioIdToken = Number(req?.usuario?.id);
    const usuarioId = Number.isFinite(usuarioIdBody)
      ? usuarioIdBody
      : Number.isFinite(usuarioIdToken)
        ? usuarioIdToken
        : null;

    if (!Array.isArray(detalles) || detalles.length === 0) {
      return res
        .status(400)
        .json({ error: "El pedido debe tener al menos un detalle" });
    }

    if (!Number.isFinite(mesaId)) {
      return res.status(400).json({ error: "mesa_id inválido" });
    }
    const pedidoExistente = await pool.query(
      `SELECT * FROM pedidos 
       WHERE mesa_id = $1 
       AND estado IN ('pendiente','confirmado','preparando','listo','entregado')`,
      [mesaId],
    );

    if (pedidoExistente.rows.length > 0) {
      throw new Error("La mesa ya está ocupada o reservada.");
    }
    await client.query("BEGIN");

    // 🚀 Crear pedido inicial
    const pedidoResult = await client.query(
      `INSERT INTO pedidos (mesa_id, usuario_id, estado, total, fecha_creacion)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [mesaId, usuarioId, "preparando", 0],
    );
    const pedido = pedidoResult.rows[0];
    let total = 0;

    // Crear cada detalle y descontar stock
    for (const detalle of detalles) {
      const recetaDetalle = await obtenerRecetaGeneral(
        client,
        detalle.producto_id,
      );
      const ingredientesAjustes = normalizarIngredientesAjustes(
        detalle.ingredientes_ajustes,
        recetaDetalle,
      );

      await client.query(
        `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, notas, precio, estado, ingredientes_ajustes)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          pedido.id,
          detalle.producto_id,
          detalle.cantidad,
          detalle.notas,
          detalle.precio,
          "pendiente",
          JSON.stringify(ingredientesAjustes),
        ],
      );

      total += detalle.precio * detalle.cantidad;

      await descontarStockProducto(
        client,
        detalle.producto_id,
        detalle.cantidad,
        ingredientesAjustes,
      );
    }

    await client.query(`UPDATE pedidos SET total = $1 WHERE id = $2`, [
      total,
      pedido.id,
    ]);

    // Al crear pedido (nace en "preparando"), la mesa debe quedar ocupada.
    await client.query(`UPDATE mesas SET estado = 'ocupada' WHERE id = $1`, [
      mesaId,
    ]);

    await client.query("COMMIT");

    const pedidoCompleto = await Pedido.obtenerPorIdConDetalles(pedido.id);
    if (req.io) req.io.emit("pedidoCreado", pedidoCompleto);

    res.status(201).json(pedidoCompleto);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error al crear pedido:", error);
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

    if (req.io) req.io.emit("pedidoActualizado", pedidoCompleto);
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
    if (req.io) req.io.emit("pedidoEliminado", { id: Number(id) });
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
    const { fecha } = req.query;

    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res
        .status(400)
        .json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD" });
    }

    const pedidos = await Pedido.obtenerPorEstadoConDetalles(estado, { fecha });
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Actualizar estado de pedido
------------------------------------------- */
exports.actualizarEstadoPedido = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const estadoDestino = String(estado || "")
      .toLowerCase()
      .trim();

    let total = null;

    await client.query("BEGIN");

    const pedidoActualResult = await client.query(
      `SELECT estado, mesa_id FROM pedidos WHERE id = $1 FOR UPDATE`,
      [id],
    );

    if (pedidoActualResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const estadoActual = String(pedidoActualResult.rows[0].estado || "")
      .toLowerCase()
      .trim();
    const mesaIdPedido = Number(pedidoActualResult.rows[0].mesa_id);

    if (estadoDestino === "cancelado") {
      const estadosPermitidosCancelar = ["listo", "pendiente", "preparando"];

      if (!estadosPermitidosCancelar.includes(estadoActual)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "Solo se puede cancelar pedidos en estado listo o pendiente",
        });
      }

      const detallesResult = await client.query(
        `SELECT producto_id, cantidad, ingredientes_ajustes FROM detalles_pedido WHERE pedido_id = $1 FOR UPDATE`,
        [id],
      );

      for (const detalle of detallesResult.rows) {
        await devolverStockProducto(
          client,
          Number(detalle.producto_id),
          Number(detalle.cantidad),
          detalle.ingredientes_ajustes,
        );
      }

      await client.query(
        `UPDATE detalles_pedido SET estado = 'cancelado' WHERE pedido_id = $1`,
        [id],
      );

      // En cancelación se libera la mesa.
      if (Number.isFinite(mesaIdPedido)) {
        await client.query(
          `UPDATE mesas SET estado = 'disponible' WHERE id = $1`,
          [mesaIdPedido],
        );
      }
    }

    // Al marcar el pedido como listo, todas sus lineas pasan a listo
    if (estadoDestino === "listo") {
      await client.query(
        `UPDATE detalles_pedido SET estado = 'listo' WHERE pedido_id = $1`,
        [id],
      );
    }

    // Recalcular total al entregar
    if (estadoDestino === "entregado") {
      const result = await client.query(
        `
        SELECT 
          COALESCE(SUM(cantidad * precio), 0) as total
        FROM detalles_pedido
        WHERE pedido_id = $1
      `,
        [id],
      );

      total = result.rows[0].total;
    }

    // 🔥 actualizar pedido
    await client.query(
      `UPDATE pedidos
       SET estado = $1,
           total = COALESCE($2, total),
           fecha_actualizacion = NOW()
       WHERE id = $3`,
      [estadoDestino || estadoActual, total, id],
    );

    await client.query("COMMIT");

    const pedidoCompleto = await Pedido.obtenerPorIdConDetalles(id);

    if (req.io) req.io.emit("pedidoActualizado", pedidoCompleto);

    res.json(pedidoCompleto);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ ERROR actualizarEstadoPedido:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

/* ------------------------------------------
   🔹 Actualizar estado de detalles puntuales
------------------------------------------- */
exports.actualizarEstadoDetallesPedido = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { estado, detalle_ids } = req.body;

    const estadoDestino = String(estado || "")
      .toLowerCase()
      .trim();
    const ids = Array.isArray(detalle_ids)
      ? detalle_ids
          .map((v) => Number(v))
          .filter((v) => Number.isInteger(v) && v > 0)
      : [];

    if (!estadoDestino || !["pendiente", "preparando", "listo"].includes(estadoDestino)) {
      return res.status(400).json({
        error: "Estado inválido para detalle. Usa pendiente, preparando o listo.",
      });
    }

    if (ids.length === 0) {
      return res.status(400).json({
        error: "Debes enviar al menos un detalle_id para actualizar.",
      });
    }

    await client.query("BEGIN");

    const pedidoResult = await client.query(
      `SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE`,
      [id],
    );

    if (pedidoResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const estadoPedido = String(pedidoResult.rows[0].estado || "")
      .toLowerCase()
      .trim();

    if (["cancelado", "cerrado"].includes(estadoPedido)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "No se puede actualizar detalles de un pedido cancelado o cerrado.",
      });
    }

    const detallesExistentes = await client.query(
      `SELECT id FROM detalles_pedido WHERE pedido_id = $1 AND id = ANY($2::int[])`,
      [id, ids],
    );

    if (detallesExistentes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "No se encontraron detalles del pedido para actualizar.",
      });
    }

    const idsValidos = detallesExistentes.rows.map((r) => Number(r.id));

    await client.query(
      `UPDATE detalles_pedido SET estado = $1 WHERE pedido_id = $2 AND id = ANY($3::int[])`,
      [estadoDestino, id, idsValidos],
    );

    const resumenEstados = await client.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE estado = 'listo')::int AS listos
       FROM detalles_pedido
       WHERE pedido_id = $1`,
      [id],
    );

    const totalDetalles = Number(resumenEstados.rows[0]?.total ?? 0);
    const totalListos = Number(resumenEstados.rows[0]?.listos ?? 0);
    const estadoPedidoNuevo =
      totalDetalles > 0 && totalListos === totalDetalles ? "listo" : "preparando";

    await client.query(
      `UPDATE pedidos
       SET estado = $1,
           fecha_actualizacion = NOW()
       WHERE id = $2`,
      [estadoPedidoNuevo, id],
    );

    await client.query("COMMIT");

    const pedidoCompleto = await Pedido.obtenerPorIdConDetalles(id);

    if (req.io) req.io.emit("pedidoActualizado", pedidoCompleto);

    res.json(pedidoCompleto);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ ERROR actualizarEstadoDetallesPedido:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
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

    if (!Array.isArray(nuevosDetalles) || nuevosDetalles.length === 0) {
      return res
        .status(400)
        .json({ error: "El pedido debe tener al menos un detalle" });
    }

    await client.query("BEGIN");

    const pedidoResult = await client.query(
      `SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE`,
      [id],
    );

    if (pedidoResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const estadoPedidoActual = String(pedidoResult.rows[0].estado || "")
      .toLowerCase()
      .trim();
    const bloquearDetallesListos = estadoPedidoActual === "entregado";
    let huboCambios = false;

    // Obtener detalles actuales
    const detallesActuales = await DetallePedido.obtenerPorPedido(id);

    // Mapa para manejar diferencias
    const actualesMap = new Map(
      detallesActuales.map((d) => [
        construirClaveDetalle(d.producto_id, d.ingredientes_ajustes),
        d,
      ]),
    );
    const nuevosMap = new Map(
      nuevosDetalles.map((d) => [
        construirClaveDetalle(d.producto_id, d.ingredientes_ajustes),
        d,
      ]),
    );

    // 1. Eliminar productos que ya no están
    for (const [detalleKey, det] of actualesMap.entries()) {
      if (!nuevosMap.has(detalleKey)) {
        if (
          bloquearDetallesListos &&
          String(det.estado || "").toLowerCase() === "listo"
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error:
              "No puedes quitar un detalle en estado listo cuando el pedido está entregado.",
          });
        }

        // devolver stock
        await devolverStockProducto(
          client,
          det.producto_id,
          det.cantidad,
          det.ingredientes_ajustes,
        );
        await client.query(`DELETE FROM detalles_pedido WHERE id = $1`, [
          det.id,
        ]);
        huboCambios = true;
      }
    }

    // 2. Actualizar productos existentes
    for (const det of nuevosDetalles) {
      const detalleKey = construirClaveDetalle(
        det.producto_id,
        det.ingredientes_ajustes,
      );
      const actual = actualesMap.get(detalleKey);

      if (actual) {
        const recetaDetalle = await obtenerRecetaGeneral(
          client,
          det.producto_id,
        );
        const ajustesActuales = normalizarIngredientesAjustes(
          actual.ingredientes_ajustes,
          recetaDetalle,
        );
        const ajustesNuevos = normalizarIngredientesAjustes(
          det.ingredientes_ajustes,
          recetaDetalle,
        );

        const cantidadNueva = Number(det.cantidad);
        const cantidadActual = Number(actual.cantidad);
        const precioNuevo = Number(det.precio);
        const notasNueva = String(det.notas ?? "");
        const notasActual = String(actual.notas ?? "");

        if (!Number.isFinite(cantidadNueva) || cantidadNueva <= 0) {
          await client.query("ROLLBACK");
          return res
            .status(400)
            .json({ error: "Cantidad inválida en los detalles del pedido" });
        }

        if (
          bloquearDetallesListos &&
          String(actual.estado || "").toLowerCase() === "listo" &&
          cantidadNueva < cantidadActual
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error:
              "No puedes disminuir un detalle en estado listo cuando el pedido está entregado.",
          });
        }

        if (
          bloquearDetallesListos &&
          String(actual.estado || "").toLowerCase() === "listo" &&
          JSON.stringify(ajustesNuevos) !== JSON.stringify(ajustesActuales)
        ) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error:
              "No puedes modificar ingredientes en un detalle listo cuando el pedido está entregado.",
          });
        }

        const reduccionActualMap = new Map(
          ajustesActuales.map((a) => [
            Number(a.ingrediente_id),
            Number(a.cantidad_reducida),
          ]),
        );
        for (const ajusteNuevo of ajustesNuevos) {
          const actualReducida = Number(
            reduccionActualMap.get(Number(ajusteNuevo.ingrediente_id)) || 0,
          );
          if (Number(ajusteNuevo.cantidad_reducida) < actualReducida) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              error:
                "Solo puedes mantener o aumentar la reducción de ingredientes, no disminuirla.",
            });
          }
        }

        const huboCambioDetalle =
          cantidadNueva !== cantidadActual ||
          notasNueva !== notasActual ||
          JSON.stringify(ajustesNuevos) !== JSON.stringify(ajustesActuales);

        if (!huboCambioDetalle) {
          continue;
        }

        await devolverStockProducto(
          client,
          det.producto_id,
          cantidadActual,
          ajustesActuales,
        );
        await descontarStockProducto(
          client,
          det.producto_id,
          cantidadNueva,
          ajustesNuevos,
        );

        await client.query(
          `UPDATE detalles_pedido 
           SET cantidad = $1,
               notas = $2,
               precio = $3,
               estado = $4,
               ingredientes_ajustes = $5::jsonb
           WHERE id = $6`,
          [
            cantidadNueva,
            notasNueva,
            precioNuevo,
            "actualizado",
            JSON.stringify(ajustesNuevos),
            actual.id,
          ],
        );

        huboCambios = true;
      }
    }

    // 3. Agregar productos nuevos
    for (const det of nuevosDetalles) {
      const detalleKey = construirClaveDetalle(
        det.producto_id,
        det.ingredientes_ajustes,
      );

      if (!actualesMap.has(detalleKey)) {
        const recetaDetalle = await obtenerRecetaGeneral(
          client,
          det.producto_id,
        );
        const ingredientesAjustes = normalizarIngredientesAjustes(
          det.ingredientes_ajustes,
          recetaDetalle,
        );

        if (
          !Number.isFinite(Number(det.cantidad)) ||
          Number(det.cantidad) <= 0
        ) {
          await client.query("ROLLBACK");
          return res
            .status(400)
            .json({ error: "Cantidad inválida en los detalles del pedido" });
        }

        await descontarStockProducto(
          client,
          det.producto_id,
          det.cantidad,
          ingredientesAjustes,
        );

        await client.query(
          `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, notas, precio, estado, ingredientes_ajustes)
           VALUES ($1, $2, $3, $4, $5, 'nuevo', $6::jsonb)`,
          [
            id,
            det.producto_id,
            det.cantidad,
            det.notas,
            det.precio,
            JSON.stringify(ingredientesAjustes),
          ],
        );

        huboCambios = true;
      }
    }

    // 4. Recalcular total
    const totalResult = await client.query(
      `SELECT COALESCE(SUM(cantidad * precio), 0) AS total
       FROM detalles_pedido
       WHERE pedido_id = $1`,
      [id],
    );
    const total = Number(totalResult.rows[0]?.total ?? 0);

    await client.query(`UPDATE pedidos SET total = $1 WHERE id = $2`, [
      total,
      id,
    ]);

    // Solo pasamos a preparando si efectivamente cambió algo.
    if (huboCambios) {
      await client.query(
        `UPDATE pedidos
         SET estado = 'preparando',
             fecha_actualizacion = NOW()
         WHERE id = $1`,
        [id],
      );
    }

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
        ingredientes_ajustes: detalle.ingredientes_ajustes,
      });
      total += detalle.precio * detalle.cantidad;
    }

    const pedidoActualizado = await Pedido.obtenerPorIdConDetalles(id);
    if (req.io) req.io.emit("pedidoActualizado", pedidoActualizado);

    res.json(pedidoActualizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------
   🔹 Liberar mesa
------------------------------------------- */
exports.liberarMesa = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const pedidoResult = await client.query(
      `SELECT mesa_id FROM pedidos WHERE id = $1 FOR UPDATE`,
      [id],
    );

    if (pedidoResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const mesaIdPedido = Number(pedidoResult.rows[0].mesa_id);

    await client.query(
      `UPDATE pedidos
       SET estado = 'cerrado',
           fecha_actualizacion = NOW()
       WHERE id = $1`,
      [id],
    );

    // Al cerrar pedido se libera la mesa.
    if (Number.isFinite(mesaIdPedido)) {
      await client.query(
        `UPDATE mesas SET estado = 'disponible' WHERE id = $1`,
        [mesaIdPedido],
      );
    }

    await client.query("COMMIT");

    const pedidoCompleto = await Pedido.obtenerPorIdConDetalles(id);

    if (req.io) req.io.emit("pedidoActualizado", pedidoCompleto);

    res.json({ success: true, pedido: pedidoCompleto });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error en liberarMesa:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};
