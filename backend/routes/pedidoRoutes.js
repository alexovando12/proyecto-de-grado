const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const auth = require('../middleware/auth');

router.get('/', auth, pedidoController.obtenerPedidos);
router.get('/:id', auth, pedidoController.obtenerPedido);
router.post('/', auth, pedidoController.crearPedido);
router.put('/:id', auth, pedidoController.actualizarPedido);
router.delete('/:id', auth, pedidoController.eliminarPedido);
router.get('/mesa/:mesa_id', auth, pedidoController.obtenerPedidosPorMesa);
router.get('/estado/:estado', auth, pedidoController.obtenerPedidosPorEstado);
router.put('/:id/estado', auth, pedidoController.actualizarEstadoPedido);

module.exports = router;