const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const mesaRoutes = require('./routes/mesaRoutes');
const productoRoutes = require('./routes/productoRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const app = express();

// =======================
// Middleware de logging
// =======================
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// =======================
// Middleware principal
// =======================
app.use(cors());
app.use(express.json());

// =======================
// Integración con Socket.IO
// =======================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // ⚠️ cámbialo si tu frontend está en otro dominio
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// ✅ Middleware para inyectar io en req (antes de las rutas)
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

// =======================
// Rutas base
// =======================
app.get('/', (req, res) => {
  res.send('API de Garden Gates funcionando!');
});

app.use('/api/auth', authRoutes);
app.use('/api/mesas', mesaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/inventario', inventarioRoutes);
// =======================
// Manejo de errores
// =======================
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

// =======================
// Levantar servidor
// =======================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📡 Socket.IO habilitado en el mismo puerto`);
});
