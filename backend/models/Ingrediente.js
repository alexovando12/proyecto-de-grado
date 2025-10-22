const pool = require('../config/db');

class Ingrediente {
  static async obtenerTodos() {
    const result = await pool.query('SELECT * FROM ingredientes ORDER BY nombre');
    return result.rows;
  }

  static async obtenerPorId(id) {
    const result = await pool.query('SELECT * FROM ingredientes WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async crear(ingrediente) {
    const { nombre, unidad, stock_actual, stock_minimo } = ingrediente;
    const result = await pool.query(
      'INSERT INTO ingredientes (nombre, unidad, stock_actual, stock_minimo) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, unidad, stock_actual, stock_minimo]
    );
    return result.rows[0];
  }

  static async actualizar(id, ingrediente) {
    const { nombre, unidad, stock_actual, stock_minimo } = ingrediente;
    const result = await pool.query(
      'UPDATE ingredientes SET nombre = $1, unidad = $2, stock_actual = $3, stock_minimo = $4 WHERE id = $5 RETURNING *',
      [nombre, unidad, stock_actual, stock_minimo, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const result = await pool.query('DELETE FROM ingredientes WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  static async actualizarStock(id, cantidad, tipo) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const stockActual = await client.query(
        'SELECT stock_actual FROM ingredientes WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (stockActual.rows.length === 0) {
        throw new Error(`Ingrediente con ID ${id} no encontrado`);
      }

      const stock = parseFloat(stockActual.rows[0].stock_actual);
      let nuevoStock;

      if (tipo === 'entrada') {
        nuevoStock = stock + parseFloat(cantidad);
      } else {
        nuevoStock = stock - parseFloat(cantidad);
        if (nuevoStock < 0) {
          throw new Error(`Stock insuficiente. Stock actual: ${stock}, Cantidad a descontar: ${cantidad}`);
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

  static async verificarStock(ingredientesNecesarios) {
    const resultados = [];

    for (const item of ingredientesNecesarios) {
      const ingrediente = await this.obtenerPorId(item.ingrediente_id);
      if (!ingrediente) {
        throw new Error(`Ingrediente con ID ${item.ingrediente_id} no encontrado`);
      }

      const cantidadNecesaria = item.cantidad;
      if (ingrediente.stock_actual < cantidadNecesaria) {
        resultados.push({
          ingrediente: ingrediente.nombre,
          necesario: cantidadNecesaria,
          disponible: ingrediente.stock_actual,
          unidad: ingrediente.unidad,
          suficiente: false
        });
      } else {
        resultados.push({
          ingrediente: ingrediente.nombre,
          necesario: cantidadNecesaria,
          disponible: ingrediente.stock_actual,
          unidad: ingrediente.unidad,
          suficiente: true
        });
      }
    }

    return resultados;
  }

  static async obtenerBajoStock() {
    const result = await pool.query(
      'SELECT * FROM ingredientes WHERE stock_actual <= stock_minimo ORDER BY stock_actual ASC'
    );
    return result.rows;
  }
}

module.exports = Ingrediente;
