const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const institutionRoutes = require('./routes/institution');
const careerRoutes = require('./routes/careers');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ✅ MIDDLEWARE DE DEBUG - AGREGAR ESTO
app.use((req, res, next) => {
  console.log(`\n🔍 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  if (Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/careers', careerRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend de Tecs funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('❌ Error global:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor: ' + error.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏫 Institutions: http://localhost:${PORT}/api/institutions`);
  console.log(`🎓 Careers: http://localhost:${PORT}/api/careers`);
  console.log(`🔍 Debug activado - viendo todas las peticiones\n`);
});