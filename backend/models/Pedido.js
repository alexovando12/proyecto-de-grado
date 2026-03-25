const pool = require('../config/db');
const Ingrediente = require('./Ingrediente');
const ProductoPreparado = require('./ProductoPreparado');

class Pedido {

  // =========================
  // CREAR PEDIDO
  // =========================
  static async crear(pedido) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { mesa_id, items } = pedido;

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('El pedido debe tener items');
      }

      // 🔥 Crear pedido
      const pedidoResult = await client.query(
        `INSERT INTO pedidos (mesa_id, estado)
         VALUES ($1, 'pendiente')
         RETURNING *`,
        [mesa_id]
      );

      const pedidoId = pedidoResult.rows[0].id;

      // 🔥 Procesar items
      for (const item of items) {

        const cantidad = Number(item.cantidad);

        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error('Cantidad inválida');
        }

        // 🟢 PRODUCTO PREPARADO
        if (item.producto_preparado_id) {

          const producto = await ProductoPreparado.obtenerPorId(item.producto_preparado_id);

          if (!producto || producto.stock_actual < cantidad) {
            throw new Error(`Stock insuficiente de ${producto?.nombre}`);
          }

          await client.query(
            `UPDATE productos_preparados
             SET stock_actual = stock_actual - $1
             WHERE id = $2`,
            [cantidad, item.producto_preparado_id]
          );
        }

        // 🔵 PLATO DIRECTO (usa ingredientes)
        if (item.producto_id) {

          const receta = await client.query(
            `SELECT r.ingrediente_id, r.cantidad, i.stock_actual, i.nombre
             FROM recetas r
             JOIN ingredientes i ON i.id = r.ingrediente_id
             WHERE r.producto_preparado_id = $1`,
            [item.producto_id]
          );

          for (const r of receta.rows) {

            const necesario = r.cantidad * cantidad;

            if (r.stock_actual < necesario) {
              throw new Error(`Stock insuficiente de ${r.nombre}`);
            }

            await client.query(
              `UPDATE ingredientes
               SET stock_actual = stock_actual - $1
               WHERE id = $2`,
              [necesario, r.ingrediente_id]
            );
          }
        }

        // 🔥 Guardar detalle
        await client.query(
          `INSERT INTO pedido_detalles (pedido_id, producto_id, producto_preparado_id, cantidad)
           VALUES ($1, $2, $3, $4)`,
          [pedidoId, item.producto_id || null, item.producto_preparado_id || null, cantidad]
        );
      }

      await client.query('COMMIT');

      return pedidoResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================
  // EDITAR PEDIDO 🔥
  // =========================
  static async editar(id, nuevoPedido) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 🔥 1. DEVOLVER STOCK ANTERIOR
      const detalles = await client.query(
        'SELECT * FROM pedido_detalles WHERE pedido_id = $1',
        [id]
      );

      for (const d of detalles.rows) {

        if (d.producto_preparado_id) {
          await client.query(
            `UPDATE productos_preparados
             SET stock_actual = stock_actual + $1
             WHERE id = $2`,
            [d.cantidad, d.producto_preparado_id]
          );
        }

        if (d.producto_id) {
          const receta = await client.query(
            `SELECT ingrediente_id, cantidad
             FROM recetas
             WHERE producto_preparado_id = $1`,
            [d.producto_id]
          );

          for (const r of receta.rows) {
            await client.query(
              `UPDATE ingredientes
               SET stock_actual = stock_actual + $1
               WHERE id = $2`,
              [r.cantidad * d.cantidad, r.ingrediente_id]
            );
          }
        }
      }

      // 🔥 2. BORRAR DETALLES
      await client.query(
        'DELETE FROM pedido_detalles WHERE pedido_id = $1',
        [id]
      );

      // 🔥 3. CREAR NUEVO (reutilizamos lógica)
      await this.crear({ ...nuevoPedido, mesa_id: nuevoPedido.mesa_id });

      await client.query('COMMIT');

      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================
  // ELIMINAR PEDIDO 🔥🔥🔥
  // =========================
  static async eliminar(id) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const detalles = await client.query(
        'SELECT * FROM pedido_detalles WHERE pedido_id = $1',
        [id]
      );

      // 🔥 DEVOLVER TODO EL STOCK
      for (const d of detalles.rows) {

        if (d.producto_preparado_id) {
          await client.query(
            `UPDATE productos_preparados
             SET stock_actual = stock_actual + $1
             WHERE id = $2`,
            [d.cantidad, d.producto_preparado_id]
          );
        }

        if (d.producto_id) {
          const receta = await client.query(
            `SELECT ingrediente_id, cantidad
             FROM recetas
             WHERE producto_preparado_id = $1`,
            [d.producto_id]
          );

          for (const r of receta.rows) {
            await client.query(
              `UPDATE ingredientes
               SET stock_actual = stock_actual + $1
               WHERE id = $2`,
              [r.cantidad * d.cantidad, r.ingrediente_id]
            );
          }
        }
      }

      await client.query('DELETE FROM pedido_detalles WHERE pedido_id = $1', [id]);
      await client.query('DELETE FROM pedidos WHERE id = $1', [id]);

      await client.query('COMMIT');

      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  // =========================
// OBTENER PEDIDOS POR MESA 🔥
// =========================
static async obtenerPorMesaConDetalles(mesa_id) {
  const result = await pool.query(`
    SELECT 
      p.id,
      p.mesa_id,
      p.estado,
      p.total,
      d.id as detalle_id,
      d.producto_id,
      d.producto_preparado_id,
      d.cantidad,
      pr.nombre as producto_nombre
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

    if (row.detalle_id) {
      pedidosMap[row.id].detalles.push({
        id: row.detalle_id,
        producto_id: row.producto_id,
        producto_preparado_id: row.producto_preparado_id,
        producto_nombre: row.producto_nombre,
        cantidad: row.cantidad
      });
    }
  }

  return Object.values(pedidosMap);
}
}

module.exports = Pedido;