const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const auth = require('../middleware/auth');

// Rutas para ingredientes
router.get('/ingredientes', auth, inventarioController.obtenerIngredientes);
router.post('/ingredientes', auth, inventarioController.crearIngrediente);
router.put('/ingredientes/:id', auth, inventarioController.actualizarIngrediente);
router.delete('/ingredientes/:id', auth, inventarioController.eliminarIngrediente);
router.get('/stock-bajo', auth, inventarioController.obtenerStockBajo);

// Rutas para productos preparados
router.get('/productos-preparados', auth, inventarioController.obtenerProductosPreparados);
router.post('/productos-preparados', auth, inventarioController.crearProductoPreparado);
router.put('/productos-preparados/:id', auth, inventarioController.actualizarProductoPreparado);
router.delete('/productos-preparados/:id', auth, inventarioController.eliminarProductoPreparado);

// Rutas para recetas
// Rutas para recetas
router.get('/productos-preparados/:id/receta', auth, inventarioController.obtenerReceta);
router.post('/productos-preparados/:id/receta', auth, inventarioController.agregarIngredienteAReceta);

// ✅ Agrega esta línea:
router.delete('/productos-preparados/:id/receta', auth, inventarioController.eliminarRecetaPorProducto);


// Rutas para operaciones
router.post('/productos-preparados/preparar', auth, inventarioController.prepararProducto);
router.post('/productos-preparados/vender', auth, inventarioController.venderProductoPreparado);
router.post('/platos-directos/vender', auth, inventarioController.venderPlatoDirecto);

// Rutas para movimientos y alertas
router.get('/movimientos', auth, inventarioController.obtenerMovimientos);
router.get('/alertas-stock', auth, inventarioController.obtenerAlertasStock);

// ⚠️ Ruta temporal de prueba (sin auth)
router.post('/test-descontar', async (req, res) => {
  const pool = require('../config/db');
  try {
    const { ingredienteId, cantidad } = req.body;
    const result = await pool.query(
      `UPDATE ingredientes
       SET stock_actual = stock_actual - $1
       WHERE id = $2
       RETURNING id, nombre, stock_actual`,
      [cantidad, ingredienteId]
    );
    res.json(result.rows[0] || { error: 'No se actualizó nada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;