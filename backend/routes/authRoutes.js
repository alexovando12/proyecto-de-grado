const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Verificar qué métodos existen antes de usarlos
console.log('Métodos disponibles en authController:');
console.log('- login:', typeof authController.login);
console.log('- registro:', typeof authController.registro);

// Solo definir rutas para métodos que existen
if (typeof authController.login === 'function') {
  router.post('/login', authController.login);
}

if (typeof authController.registro === 'function') {
  router.post('/registro', authController.registro);
}

module.exports = router;