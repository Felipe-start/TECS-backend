// ============================================
// CONFIGURACIÓN INICIAL
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ============================================
// CONFIGURACIÓN DE CORS PARA GITHUB CODESPACES
// ============================================
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo o Codespaces, permitir todos los orígenes
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log(`🌐 Permitido (desarrollo): ${origin}`);
      return callback(null, true);
    }
    
    // Permitir requests sin origen (mobile apps, curl, etc.)
    if (!origin) {
      console.log('🌐 Request sin origen, permitiendo...');
      return callback(null, true);
    }
    
    // Lista de orígenes permitidos para producción
    const allowedOrigins = [
      // Dominios locales de desarrollo
      'http://localhost:4200',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:4200',
      'http://127.0.0.1:3000',
      
      // Patrones de GitHub Codespaces
      /https:\/\/(.*)-4200\.app\.github\.dev$/,
      /https:\/\/(.*)-3000\.app\.github\.dev$/,
      /https:\/\/(.*)-8080\.app\.github\.dev$/,
      /https:\/\/(.*)\.githubpreview\.dev$/,
      /https:\/\/(.*)\.github\.dev$/,
      
      // URLs específicas de tu Codespace actual (ajústalas según sea necesario)
      'https://ubiquitous-space-robot-7vjv54v75vg2wx7q-4200.app.github.dev',
      'https://scaling-barnacle-97j97j6vrrwj2p7pp-3000.app.github.dev'
    ];
    
    // Verificar si el origen está permitido
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      console.log(`✅ Origen permitido: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`❌ Origen bloqueado: ${origin}`);
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-API-Key'
  ],
  exposedHeaders: ['Authorization', 'Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400, // 24 horas de cache para preflight
  optionsSuccessStatus: 200
};

// Aplicar CORS
app.use(cors(corsOptions));

// Manejar explícitamente peticiones OPTIONS (preflight)
app.options('*', cors(corsOptions));

// ============================================
// MIDDLEWARE DE PARSING
// ============================================
app.use(express.json({ 
  limit: '50mb' 
}));

app.use(express.urlencoded({ 
  limit: '50mb', 
  extended: true,
  parameterLimit: 50000
}));

// Middleware para logging de todas las peticiones
app.use((req, res, next) => {
  console.log('📥 Petición recibida:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent']
  });
  next();
});

// ============================================
// SERVIR ARCHIVOS ESTÁTICOS
// ============================================
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// IMPORTAR Y CONFIGURAR RUTAS
// ============================================
try {
  console.log('🔄 Importando rutas...');
  
  const authRoutes = require('./routes/auth');
  const careerRoutes = require('./routes/careers');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/careers', careerRoutes);
  
  console.log('✅ Rutas cargadas: /api/auth, /api/careers');
  
  // Intentar cargar rutas de instituciones (opcional)
  try {
    const institutionRoutes = require('./routes/institution');
    app.use('/api/institutions', institutionRoutes);
    console.log('✅ Ruta cargada: /api/institutions');
  } catch (instError) {
    console.log('ℹ️  Ruta de instituciones no disponible');
  }
  
} catch (error) {
  console.error('❌ Error cargando rutas:', error.message);
  process.exit(1);
}

// ============================================
// RUTAS DEL SISTEMA
// ============================================

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 API del Sistema TecNM',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      root: '/',
      health: '/api/health',
      testDb: '/api/test-db',
      auth: '/api/auth',
      careers: '/api/careers',
      institutions: '/api/institutions'
    },
    documentation: 'Consulta la documentación para más detalles'
  });
});

// Health check del sistema
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Sistema TecNM API',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    cors: {
      origin: req.headers.origin || 'none',
      allowed: true
    }
  };
  
  res.json({
    success: true,
    message: '✅ Sistema funcionando correctamente',
    data: healthData
  });
});

// Test de conexión a base de datos
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('🔍 Testeando conexión a base de datos...');
    const db = require('./config/database');
    
    // Ejecutar consulta simple
    const [result] = await db.promise().query(
      'SELECT 1 + 1 AS solution, NOW() as server_time, DATABASE() as database_name, USER() as current_user'
    );
    
    console.log('✅ Conexión a BD exitosa');
    
    res.json({
      success: true,
      message: '✅ Conexión a base de datos exitosa',
      data: {
        solution: result[0].solution,
        serverTime: result[0].server_time,
        database: result[0].database_name,
        user: result[0].current_user,
        connection: 'active'
      }
    });
  } catch (error) {
    console.error('❌ Error de conexión a BD:', error.message);
    
    res.status(500).json({
      success: false,
      message: '❌ Error de conexión a base de datos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: 'Verifique la configuración de la base de datos en config/database.js',
      suggestion: 'Asegúrese de que MySQL esté corriendo y las credenciales sean correctas'
    });
  }
});

// ============================================
// MANEJO DE ERRORES
// ============================================

// Middleware para rutas no encontradas (404)
app.use('*', (req, res) => {
  console.warn(`⚠️ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    suggestion: 'Verifique la URL y el método HTTP',
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test-db',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/profile',
      'GET /api/careers',
      'GET /api/careers/my'
    ]
  });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error global:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    origin: req.headers.origin
  });
  
  // Determinar código de estado
  const statusCode = err.status || err.statusCode || 500;
  
  // Si es error de CORS
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Acceso bloqueado por política CORS',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      origin: req.headers.origin,
      suggestion: 'Contacte al administrador para agregar su dominio a la lista de orígenes permitidos'
    });
  }
  
  res.status(statusCode).json({
    success: false,
    message: '❌ Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // IMPORTANTE para Codespaces

// Verificar que el archivo authController.js exista
try {
  require('./controllers/authController');
  console.log('✅ Controlador de autenticación cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando authController:', error.message);
  console.error('Asegúrate de que el archivo controllers/authController.js exista y tenga el método register');
  process.exit(1);
}

// Iniciar servidor
const server = app.listen(PORT, HOST, () => {
  const address = server.address();
  const actualHost = address.address === '::' ? 'localhost' : address.address;
  
  console.log(`
  ==========================================
  🚀 SERVIDOR INICIADO CORRECTAMENTE
  ==========================================
  🌐 URL Local: http://${actualHost}:${PORT}
  📡 Host: ${HOST}
  🔢 Puerto: ${PORT}
  ⏰ Iniciado: ${new Date().toLocaleString()}
  ==========================================
  📍 ENDPOINTS PRINCIPALES:
  • http://${actualHost}:${PORT}/          - Página principal
  • http://${actualHost}:${PORT}/api/health - Health check
  • http://${actualHost}:${PORT}/api/test-db - Test BD
  • http://${actualHost}:${PORT}/api/auth   - Autenticación
  • http://${actualHost}:${PORT}/api/careers - Carreras
  ==========================================
  🔧 ENTORNO: ${process.env.NODE_ENV || 'development'}
  🐳 CODESPACES: ${process.env.CODESPACES ? 'Sí' : 'No'}
  ==========================================
  `);
  
  // Mostrar URL de Codespaces si está disponible
  if (process.env.CODESPACES) {
    console.log(`🌍 URL Pública: https://${process.env.CODESPACE_NAME}-${PORT}.app.github.dev`);
  }
});

// Manejo de cierre elegante
process.on('SIGINT', () => {
  console.log('\n🔻 Recibido SIGINT. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado exitosamente');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🔻 Recibido SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado exitosamente');
    process.exit(0);
  });
});

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});