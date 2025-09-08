const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
  try {
    console.log('=== INICIO LOGIN ===');
    console.log('Body:', req.body);
    
    // Estandarizar: siempre usar 'password'
    const email = req.body.email;
    const password = req.body.password; // Siempre usar 'password'
    
    console.log('Email:', email);
    console.log('Password:', password ? 'proporcionado' : 'no proporcionado');
    
    // Validación básica
    if (!email || !password) {
      console.log('❌ Faltan datos requeridos');
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos'
      });
    }
    
    console.log('🔍 Buscando usuario:', email);
    const usuario = await Usuario.obtenerPorEmail(email);
    
    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    console.log('✅ Usuario encontrado:', {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    });
    
    // Verificar la contraseña
    console.log('🔐 Verificando contraseña...');
    console.log('Contraseña enviada:', password);
    console.log('Hash en BD:', usuario.contrasena);
    
    let passwordValida;
    try {
      passwordValida = bcrypt.compareSync(password, usuario.contrasena);
      console.log('🔐 Contraseña válida:', passwordValida);
    } catch (bcryptError) {
      console.error('❌ Error al verificar contraseña:', bcryptError);
      return res.status(500).json({ error: 'Error al verificar contraseña' });
    }
    
    if (!passwordValida) {
      console.log('❌ Contraseña inválida');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar token
    console.log('🔑 Generando token...');
    let token;
    try {
      token = jwt.sign(
        { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      console.log('✅ Token generado exitosamente');
    } catch (jwtError) {
      console.error('❌ Error al generar token:', jwtError);
      return res.status(500).json({ error: 'Error al generar token' });
    }
    
    console.log('=== LOGIN EXITOSO ===');
    
    res.json({ 
      token, 
      usuario: { 
        id: usuario.id, 
        nombre: usuario.nombre, 
        rol: usuario.rol 
      } 
    });
  } catch (error) {
    console.error('❌ Error general en login:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};