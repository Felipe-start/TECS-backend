const express = require('express');
const app = express();

app.use(express.json());

// Test simple de rutas
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando' });
});

// Test de importación de rutas
try {
  console.log('🔍 Probando importación de authRoutes...');
  const authRoutes = require('./routes/auth');
  console.log('✅ authRoutes importado correctamente');
} catch (error) {
  console.error('❌ Error importando authRoutes:', error.message);
}

try {
  console.log('🔍 Probando importación de careerRoutes...');
  const careerRoutes = require('./routes/careers');
  console.log('✅ careerRoutes importado correctamente');
} catch (error) {
  console.error('❌ Error importando careerRoutes:', error.message);
}

try {
  console.log('🔍 Probando importación de institutionRoutes...');
  const institutionRoutes = require('./routes/institution'); // o institutions
  console.log('✅ institutionRoutes importado correctamente');
} catch (error) {
  console.error('❌ Error importando institutionRoutes:', error.message);
}

app.listen(3001, () => {
  console.log('🚀 Servidor de prueba en puerto 3001');
});