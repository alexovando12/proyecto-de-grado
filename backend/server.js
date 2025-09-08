const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const mesaRoutes = require('./routes/mesaRoutes');
const productoRoutes = require('./routes/productoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');

const app = express();

// Middleware para logging de peticiones
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Rutas de prueba
app.get('/', (req, res) => {
  res.send('API de Garden Gates funcionando!');
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/pedidos', pedidoRoutes);
// Middleware de manejo de errores detallado
app.use((err, req, res, next) => {
  console.error('=== ERROR DETALLADO ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Method:', req.method);
  console.error('URL:', req.url);
  console.error('Body:', req.body);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('======================');
  
  res.status(500).json({ 
    error: 'Error interno del servidor',
    details: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});