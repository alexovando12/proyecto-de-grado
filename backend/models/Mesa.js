const pool = require('../config/db');

class Mesa {
  static async obtenerTodas() {
    const result = await pool.query('SELECT * FROM mesas ORDER BY numero');
    return result.rows;
  }

  static async obtenerPorId(id) {
    const result = await pool.query('SELECT * FROM mesas WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async crear(mesa) {
    const { numero, capacidad } = mesa;
    const result = await pool.query(
      'INSERT INTO mesas (numero, capacidad) VALUES ($1, $2) RETURNING *',
      [numero, capacidad]
    );
    return result.rows[0];
  }

  static async actualizar(id, mesa) {
    const { numero, capacidad, estado } = mesa;
    const result = await pool.query(
      'UPDATE mesas SET numero = $1, capacidad = $2, estado = $3 WHERE id = $4 RETURNING *',
      [numero, capacidad, estado, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const result = await pool.query('DELETE FROM mesas WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

module.exports = Mesa;