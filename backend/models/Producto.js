const pool = require('../config/db');

class Producto {
  static async obtenerTodos() {
    const result = await pool.query('SELECT * FROM productos ORDER BY nombre');
    return result.rows;
  }

  static async obtenerPorId(id) {
    const result = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async crear(producto) {
    const { nombre, descripcion, precio, categoria } = producto;
    const result = await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio, categoria) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, descripcion, precio, categoria]
    );
    return result.rows[0];
  }

  static async actualizar(id, producto) {
    const { nombre, descripcion, precio, categoria } = producto;
    const result = await pool.query(
      'UPDATE productos SET nombre = $1, descripcion = $2, precio = $3, categoria = $4 WHERE id = $5 RETURNING *',
      [nombre, descripcion, precio, categoria, id]
    );
    return result.rows[0];
  }

  static async eliminar(id) {
    const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async obtenerPorCategoria(categoria) {
    const result = await pool.query('SELECT * FROM productos WHERE categoria = $1 ORDER BY nombre', [categoria]);
    return result.rows;
  }

  static async buscar(termino) {
    const result = await pool.query(
      "SELECT * FROM productos WHERE nombre ILIKE $1 OR descripcion ILIKE $1 ORDER BY nombre",
      [`%${termino}%`]
    );
    return result.rows;
  }
}

module.exports = Producto;