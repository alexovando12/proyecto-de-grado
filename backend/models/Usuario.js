const pool = require('../config/db');

class Usuario {
  static async obtenerPorEmail(email) {
    try {
      console.log('Consultando usuario con email:', email);
      const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      console.log('Resultado consulta:', result.rows);
      return result.rows[0];
    } catch (error) {
      console.error('Error en obtenerPorEmail:', error);
      throw error;
    }
  }

  static async crear(usuario) {
    try {
      const { nombre, email, contrasena, rol } = usuario;
      const result = await pool.query(
        'INSERT INTO usuarios (nombre, email, contrasena, rol) VALUES ($1, $2, $3, $4) RETURNING *',
        [nombre, email, contrasena, rol]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error en crear usuario:', error);
      throw error;
    }
  }
}

module.exports = Usuario;