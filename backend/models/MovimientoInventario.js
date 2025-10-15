const pool = require('../config/db');

class MovimientoInventario {
    static async obtenerTodos(filtros = {}) {
        let query = `
            SELECT mi.*, 
                   CASE 
                       WHEN mi.tipo_inventario = 'ingrediente' THEN i.nombre 
                       WHEN mi.tipo_inventario = 'producto_preparado' THEN pp.nombre 
                   END as item_nombre
            FROM movimientos_inventario mi
            LEFT JOIN ingredientes i ON mi.tipo_inventario = 'ingrediente' AND mi.item_id = i.id
            LEFT JOIN productos_preparados pp ON mi.tipo_inventario = 'producto_preparado' AND mi.item_id = pp.id
        `;
        
        const params = [];
        if (filtros.fechaInicio && filtros.fechaFin) {
            query += ' WHERE mi.fecha_creacion BETWEEN $1 AND $2';
            params.push(filtros.fechaInicio, filtros.fechaFin);
        }
        
        query += ' ORDER BY mi.fecha_creacion DESC';
        
        const result = await pool.query(query, params);
        return result.rows;
    }

    // CORREGIDO: Método para crear movimiento con todos los campos necesarios
    static async crear(movimiento) {
        const { 
            tipo_inventario, 
            item_id, 
            ingrediente_id, 
            tipo, 
            cantidad, 
            motivo, 
            usuario_id 
        } = movimiento;
        
        const result = await pool.query(
            `INSERT INTO movimientos_inventario 
             (tipo_inventario, item_id, ingrediente_id, tipo, cantidad, motivo, usuario_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [tipo_inventario, item_id, ingrediente_id, tipo, cantidad, motivo, usuario_id]
        );
        return result.rows[0];
    }
}

module.exports = MovimientoInventario;