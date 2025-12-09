const jwt = require('jsonwebtoken');

const authorize = (roles = []) => {
  // Si roles es un string, convertirlo a array
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    try {
      console.log('🔐 Iniciando verificación de autorización...');
      
      // Obtener token del header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        console.log('❌ No se encontró header de autorización');
        return res.status(401).json({
          success: false,
          message: 'Acceso no autorizado: Token no proporcionado'
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        console.log('❌ Formato de token incorrecto:', authHeader.substring(0, 20));
        return res.status(401).json({
          success: false,
          message: 'Formato de token inválido. Use: Bearer <token>'
        });
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        console.log('❌ Token vacío después de Bearer');
        return res.status(401).json({
          success: false,
          message: 'Token no proporcionado'
        });
      }

      console.log('🔑 Verificando token...');
      
      // Verificar token
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'clave_simple_tec_2024'
      );
      
      console.log('✅ Token válido para usuario:', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      });
      
      // Adjuntar usuario al request
      req.user = decoded;
      req.userId = decoded.userId; // Propiedad adicional para facilidad

      // Verificar rol si se especificó
      if (roles.length > 0) {
        console.log(`🔍 Verificando rol. Requerido: ${roles}, Actual: ${decoded.role}`);
        
        if (!roles.includes(decoded.role)) {
          console.log('❌ Acceso denegado: Rol insuficiente');
          return res.status(403).json({
            success: false,
            message: 'Acceso denegado: No tienes los permisos necesarios',
            requiredRoles: roles,
            userRole: decoded.role
          });
        }
      }

      console.log('✅ Autorización exitosa');
      next();
      
    } catch (error) {
      console.error('❌ Error en autenticación:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Manejar diferentes tipos de errores de JWT
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido o mal formado',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Por favor, inicie sesión nuevamente',
          expiredAt: error.expiredAt
        });
      }
      
      // Error de sintaxis (token mal formado)
      if (error.name === 'SyntaxError') {
        return res.status(401).json({
          success: false,
          message: 'Token mal formado'
        });
      }
      
      // Error interno del servidor
      console.error('❌ Error interno en middleware de autenticación:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno en el servidor de autenticación',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

// Middleware adicional para logging de peticiones autenticadas
const requestLogger = (req, res, next) => {
  console.log('📥 Nueva petición:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']
  });
  next();
};

// Middleware para parsear JSON con manejo de errores
const safeJsonParser = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ Error parseando JSON:', err.message);
    return res.status(400).json({
      success: false,
      message: 'JSON inválido en el cuerpo de la petición',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next();
};

module.exports = { 
  authorize,
  requestLogger,
  safeJsonParser 
};