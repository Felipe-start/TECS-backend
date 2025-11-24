const mysql = require('mysql2');

// Crear pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'tec_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Probar conexión
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('✅ Conectado a la base de datos MySQL');
  connection.release();
});

// Exportar tanto el pool como la versión con promesas
module.exports = pool;
module.exports.promise = pool.promise();