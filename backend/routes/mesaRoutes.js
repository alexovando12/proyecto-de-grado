const express = require('express');
const router = express.Router();
const mesaController = require('../controllers/mesaController');
const auth = require('../middleware/auth');

router.get('/', auth, mesaController.obtenerMesas);
router.post('/', auth, mesaController.crearMesa);
router.put('/:id', auth, mesaController.actualizarMesa);
router.delete('/:id', auth, mesaController.eliminarMesa);

module.exports = router;