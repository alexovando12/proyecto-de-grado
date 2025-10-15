// middleware/roleCheck.js
const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    if (!allowedRoles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    next();
  };
};

module.exports = roleCheck;
