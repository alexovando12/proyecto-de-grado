const pool = require("../config/db");

class Usuario {
static async obtenerPorEmail(email) {
  const infoConexion = await pool.query(`
    SELECT
      current_database() AS database,
      current_schema() AS schema,
      current_user AS usuario,
      inet_server_addr() AS servidor
  `);

  console.log("🔌 CONEXIÓN REAL:", infoConexion.rows[0]);

  const columnas = await pool.query(`
    SELECT
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'usuarios'
    ORDER BY ordinal_position
  `);

  console.log("📋 COLUMNAS REALES:", columnas.rows);

  const result = await pool.query(
    `
      SELECT *
      FROM public.usuarios
      WHERE email = $1
        AND estado = true
      LIMIT 1
    `,
    [email],
  );

  console.log("👤 USUARIO CRUDO:", result.rows[0]);
  console.log("🔑 ROL CRUDO:", result.rows[0]?.rol);

  return result.rows[0];
}
  static async obtenerTodos() {
    const result = await pool.query(
      `SELECT id, nombre, email, contrasena, rol, estado, fecha_creacion
       FROM usuarios
       WHERE estado = true
       ORDER BY fecha_creacion DESC, id DESC`,
    );
    return result.rows;
  }

  static async obtenerPorId(id) {
    const result = await pool.query(
      `SELECT id, nombre, email, contrasena, rol, estado, fecha_creacion
       FROM usuarios
       WHERE id = $1 AND estado = true`,
      [id],
    );
    return result.rows[0];
  }

  static async crear(usuario) {
    const { nombre, email, contrasena, rol } = usuario;
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, contrasena, rol, estado)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, nombre, email, contrasena, rol, estado, fecha_creacion`,
      [nombre, email, contrasena, rol],
    );
    return result.rows[0];
  }

  static async actualizar(id, usuario) {
    const { nombre, email, contrasena, rol } = usuario;
    const result = await pool.query(
      `UPDATE usuarios
       SET nombre = $1,
           email = $2,
           contrasena = $3,
           rol = $4
       WHERE id = $5 AND estado = true
       RETURNING id, nombre, email, contrasena, rol, estado, fecha_creacion`,
      [nombre, email, contrasena, rol, id],
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const result = await pool.query(
      `UPDATE usuarios
       SET estado = false
       WHERE id = $1 AND estado = true
       RETURNING id, nombre, email, contrasena, rol, estado, fecha_creacion`,
      [id],
    );
    return result.rows[0];
  }
}

module.exports = Usuario;