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
  const { capacidad } = mesa;

  // 🔥 VALIDACIÓN
  const capacidadNum = Number(capacidad);

  if (isNaN(capacidadNum) || capacidadNum < 1 || capacidadNum > 20) {
    throw new Error('Capacidad inválida (1 - 20 personas)');
  }

  // 🔥 Obtener siguiente número
  const resultNumero = await pool.query(
    'SELECT MAX(numero::int) as max FROM mesas'
  );

  const maxNumero = Number(resultNumero.rows[0].max) || 0;
  const nuevoNumero = maxNumero + 1;

  // 🔥 Insertar
  const result = await pool.query(
    'INSERT INTO mesas (numero, capacidad) VALUES ($1, $2) RETURNING *',
    [nuevoNumero, capacidadNum]
  );

  return result.rows[0];
}

static async actualizar(id, mesa) {
  const { numero, capacidad, estado } = mesa;

  const capacidadNum = Number(capacidad);

  if (isNaN(capacidadNum) || capacidadNum < 1 || capacidadNum > 20) {
    throw new Error('Capacidad inválida (1 - 20 personas)');
  }

  const result = await pool.query(
    'UPDATE mesas SET numero = $1, capacidad = $2, estado = $3 WHERE id = $4 RETURNING *',
    [numero, capacidadNum, estado, id]
  );

  return result.rows[0];
}

static async eliminar(id) {
  const pedidos = await pool.query(
    `SELECT * FROM pedidos 
     WHERE mesa_id = $1 
     AND estado IN ('pendiente','confirmado','preparando','listo')`,
    [id]
  );

  if (pedidos.rows.length > 0) {
    throw new Error('No puedes eliminar una mesa con pedidos activos');
  }

  const result = await pool.query(
    'DELETE FROM mesas WHERE id = $1 RETURNING *',
    [id]
  );

  return result.rows[0];
}
}

module.exports = Mesa;