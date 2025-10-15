const pool = require('../config/db');

class ProductoPreparado {
    static async obtenerTodos() {
        const result = await pool.query('SELECT * FROM productos_preparados ORDER BY nombre ASC');
        return result.rows;
    }

    static async obtenerPorId(id) {
        const result = await pool.query('SELECT * FROM productos_preparados WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async crear(producto) {
        const { nombre, descripcion, unidad, stock_actual, stock_minimo, costo_por_unidad } = producto;
        const result = await pool.query(
            'INSERT INTO productos_preparados (nombre, descripcion, unidad, stock_actual, stock_minimo, costo_por_unidad) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [nombre, descripcion, unidad, stock_actual, stock_minimo, costo_por_unidad]
        );
        return result.rows[0];
    }

    static async actualizar(id, producto) {
        const { nombre, descripcion, unidad, stock_actual, stock_minimo, costo_por_unidad } = producto;

        // Normaliza los valores numéricos (evita errores con comas tipo "30,00")
        const stockActualNum = Number(String(stock_actual).replace(',', '.')) || 0;
        const stockMinimoNum = Number(String(stock_minimo).replace(',', '.')) || 0;
        const costoPorUnidadNum = Number(String(costo_por_unidad).replace(',', '.')) || 0;

        const result = await pool.query(
            `UPDATE productos_preparados
             SET nombre = $1,
                 descripcion = $2,
                 unidad = $3,
                 stock_actual = $4,
                 stock_minimo = $5,
                 costo_por_unidad = $6
             WHERE id = $7
             RETURNING *`,
            [nombre, descripcion, unidad, stockActualNum, stockMinimoNum, costoPorUnidadNum, id]
        );

        if (result.rowCount === 0) {
            throw new Error('Producto no encontrado');
        }

        return result.rows[0];
    }

    // CORREGIDO: Método para actualizar stock con más detalles
    static async actualizarStock(id, cantidad, tipo) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Obtener stock actual
            const stockActual = await client.query(
                'SELECT stock_actual FROM productos_preparados WHERE id = $1 FOR UPDATE',
                [id]
            );
            
            if (stockActual.rows.length === 0) {
                throw new Error(`Producto con ID ${id} no encontrado`);
            }
            
            const stock = parseFloat(stockActual.rows[0].stock_actual);
            
            // Calcular nuevo stock
            let nuevoStock;
            if (tipo === 'entrada') {
                nuevoStock = stock + parseFloat(cantidad);
            } else {
                nuevoStock = stock - parseFloat(cantidad);
                
                // Verificar que no quede en negativo
                if (nuevoStock < 0) {
                    throw new Error(`Stock insuficiente. Stock actual: ${stock}, Cantidad a descontar: ${cantidad}`);
                }
            }
            
            // Actualizar stock
            const updateResult = await client.query(
                'UPDATE productos_preparados SET stock_actual = $1 WHERE id = $2 RETURNING stock_actual',
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

    static async obtenerBajoStock() {
        const result = await pool.query(
            'SELECT * FROM productos_preparados WHERE stock_actual <= stock_minimo ORDER BY stock_actual ASC'
        );
        return result.rows;
    }
}

module.exports = ProductoPreparado;