// middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const header = req.header('Authorization');
    if (!header) {
      return res.status(401).json({ error: 'Falta token de autorización' });
    }

    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = decoded; // Guarda los datos del usuario decodificado
    next();
  } catch (error) {
    console.error('❌ Error en middleware auth:', error.message);
    res.status(401).json({ error: 'Token no válido o expirado' });
  }
};

module.exports = auth;
