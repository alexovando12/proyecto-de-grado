const pool = require('../config/db');

class Ingrediente {

  static async obtenerTodos() {
    const result = await pool.query(
      'SELECT * FROM ingredientes WHERE activo = true ORDER BY nombre'
    );
    return result.rows;
  }

  static async obtenerPorId(id) {
    const result = await pool.query(
      'SELECT * FROM ingredientes WHERE id = $1 AND activo = true',
      [id]
    );
    return result.rows[0];
  }

  // =========================
  // CREAR INGREDIENTE
  // =========================
  static async crear(ingrediente) {
    let { nombre, unidad, stock_actual, stock_minimo } = ingrediente;

    // 🔥 VALIDACIONES
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      throw new Error('Nombre inválido');
    }

    nombre = nombre.trim();

    unidad = (unidad || 'g').toString().trim();

    const stockActual = Number(stock_actual);
    const stockMinimo = Number(stock_minimo);

    if (!Number.isFinite(stockActual) || stockActual < 0 || stockActual > 100000) {
      throw new Error('Stock actual inválido');
    }

    if (!Number.isFinite(stockMinimo) || stockMinimo < 0 || stockMinimo > 100000) {
      throw new Error('Stock mínimo inválido');
    }

    const result = await pool.query(
      `INSERT INTO ingredientes 
       (nombre, unidad, stock_actual, stock_minimo, activo) 
       VALUES ($1, $2, $3, $4, true) 
       RETURNING *`,
      [nombre, unidad, stockActual, stockMinimo]
    );

    return result.rows[0];
  }

  // =========================
  // ACTUALIZAR INGREDIENTE
  // =========================
static async actualizar(id, ingrediente) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { nombre, unidad, stock_minimo, ajuste } = ingrediente;

    // 🔥 VALIDACIONES
    if (!nombre || !nombre.trim()) {
      throw new Error('Nombre inválido');
    }

    if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
      throw new Error('El nombre solo puede contener letras y números');
    }

    const ajusteNum = Number(ajuste || 0);

    if (!Number.isFinite(ajusteNum)) {
      throw new Error('Ajuste inválido');
    }

    if (Math.abs(ajusteNum) > 10000) {
      throw new Error('Cantidad demasiado grande');
    }

    // 🔥 OBTENER STOCK ACTUAL
    const actual = await client.query(
      'SELECT stock_actual FROM ingredientes WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (actual.rows.length === 0) {
      throw new Error('Ingrediente no encontrado');
    }

    const stockActual = Number(actual.rows[0].stock_actual);

    const nuevoStock = stockActual + ajusteNum;

    if (nuevoStock < 0) {
      throw new Error('El stock no puede ser negativo');
    }

    // 🔥 UPDATE FINAL
    const result = await client.query(
      `UPDATE ingredientes
       SET nombre = $1,
           unidad = $2,
           stock_actual = $3,
           stock_minimo = $4
       WHERE id = $5
       RETURNING *`,
      [
        nombre.trim(),
        unidad,
        nuevoStock,
        Number(stock_minimo),
        id
      ]
    );

    await client.query('COMMIT');

    return result.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
  // =========================
  // ELIMINAR (SOFT DELETE)
  // =========================
static async eliminar(id) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 🔥 VERIFICAR SI ESTÁ EN RECETAS
    const uso = await client.query(
      'SELECT COUNT(*) FROM recetas WHERE ingrediente_id = $1',
      [id]
    );

    const enUso = Number(uso.rows[0].count);

    if (enUso > 0) {
      throw new Error('No puedes eliminar este ingrediente porque está siendo usado en recetas');
    }

    // 🔥 ELIMINAR SI NO ESTÁ EN USO
    const result = await client.query(
      'DELETE FROM ingredientes WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');

    return result.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

  // =========================
  // ACTUALIZAR STOCK (PRO)
  // =========================
  static async actualizarStock(id, cantidad, tipo) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const cantidadNum = Number(cantidad);

      if (!Number.isFinite(cantidadNum) || cantidadNum <= 0 || cantidadNum > 100000) {
        throw new Error('Cantidad inválida');
      }

      if (!['entrada', 'salida'].includes(tipo)) {
        throw new Error('Tipo inválido');
      }

      const stockActual = await client.query(
        'SELECT stock_actual, nombre FROM ingredientes WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (stockActual.rows.length === 0) {
        throw new Error('Ingrediente no encontrado');
      }

      const stock = Number(stockActual.rows[0].stock_actual);
      let nuevoStock;

      if (tipo === 'entrada') {
        nuevoStock = stock + cantidadNum;
      } else {
        nuevoStock = stock - cantidadNum;

        if (nuevoStock < 0) {
          throw new Error(
            `Stock insuficiente de ${stockActual.rows[0].nombre}. Disponible: ${stock}`
          );
        }
      }

      const updateResult = await client.query(
        'UPDATE ingredientes SET stock_actual = $1 WHERE id = $2 RETURNING stock_actual',
        [nuevoStock, id]
      );

      await client.query('COMMIT');

      return {
        success: true,
        stockAnterior: stock,
        stockNuevo: updateResult.rows[0].stock_actual
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================
  // VERIFICAR STOCK
  // =========================
  static async verificarStock(ingredientesNecesarios) {
    const resultados = [];

    for (const item of ingredientesNecesarios) {

      const ingrediente = await this.obtenerPorId(item.ingrediente_id);

      if (!ingrediente) {
        throw new Error(`Ingrediente ${item.ingrediente_id} no existe`);
      }

      const cantidad = Number(item.cantidad);

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error('Cantidad inválida en receta');
      }

      resultados.push({
        ingrediente: ingrediente.nombre,
        necesario: cantidad,
        disponible: ingrediente.stock_actual,
        unidad: ingrediente.unidad,
        suficiente: ingrediente.stock_actual >= cantidad
      });
    }

    return resultados;
  }

  // =========================
  // STOCK BAJO
  // =========================
  static async obtenerBajoStock() {
    const result = await pool.query(
      `SELECT * 
       FROM ingredientes 
       WHERE stock_actual <= stock_minimo 
       AND activo = true
       ORDER BY stock_actual ASC`
    );

    return result.rows;
  }
}

module.exports = Ingrediente;