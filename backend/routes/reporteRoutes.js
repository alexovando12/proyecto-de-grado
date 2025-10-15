const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const auth = require('../middleware/auth');

router.get('/ventas', auth, reporteController.generarReporteVentas);
router.get('/productos-populares', auth, reporteController.generarReporteProductosPopulares);
router.get('/inventario', auth, reporteController.generarReporteInventario);
router.get('/movimientos', auth, reporteController.generarReporteMovimientos);

module.exports = router;