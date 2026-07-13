const pool = require('../config/db');

class Receta {
  static async obtenerPorProducto(productoId) {
    const result = await pool.query(
      `SELECT r.*, i.nombre as ingrediente_nombre, i.unidad as ingrediente_unidad 
       FROM recetas r 
       JOIN ingredientes i ON r.ingrediente_id = i.id 
       WHERE r.producto_preparado_id = $1`,
      [productoId]
    );
    return result.rows;
  }


  static async agregarIngrediente(productoId, ingredienteId, cantidad) {
    const result = await pool.query(
      'INSERT INTO recetas (producto_preparado_id, ingrediente_id, cantidad) VALUES ($1, $2, $3) RETURNING *',
      [productoId, ingredienteId, cantidad]
    );
    return result.rows[0];
  }

  static async eliminarPorProducto(productoId) {
    const result = await pool.query('DELETE FROM recetas WHERE producto_preparado_id = $1', [productoId]);
    return result.rowCount;
  }
}

module.exports = Receta;
