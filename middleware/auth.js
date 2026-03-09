const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Token no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Formato de token inválido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que la sesión existe y no ha expirado
    const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
      .get(token, Date.now());
    
    if (!session) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Sesión expirada o inválida'
      });
    }

    // Verificar que el usuario existe y está activo
    const user = db.prepare('SELECT id, username, role, is_active FROM users WHERE id = ?')
      .get(decoded.id);
    
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Usuario inactivo o no encontrado'
      });
    }

    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Token expirado'
      });
    }
    
    return res.status(500).json({
      error: 'Error del servidor',
      message: error.message
    });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Autenticación requerida'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Prohibido',
        message: 'No tienes permisos para esta acción'
      });
    }

    next();
  };
}

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
