const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const auth = require('../middleware/auth');

// Rutas públicas (pueden ser accedidas sin autenticación)
router.get('/', productoController.obtenerProductos);
router.get('/buscar', productoController.buscarProductos);
router.get('/categoria/:categoria', productoController.obtenerProductosPorCategoria);
router.get('/:id', productoController.obtenerProducto);

// Rutas protegidas (requieren autenticación)
router.post('/', auth, productoController.crearProducto);
router.put('/:id', auth, productoController.actualizarProducto);
router.delete('/:id', auth, productoController.eliminarProducto);

module.exports = router;