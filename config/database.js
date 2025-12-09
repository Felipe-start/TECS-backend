const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'sistema_tec',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Manejar errores de conexión
db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err);
        console.log('Intentando reconectar en 5 segundos...');
        setTimeout(() => db.connect(), 5000);
        return;
    }
    console.log('✅ Conectado a MySQL');
});

// Manejar errores después de la conexión
db.on('error', (err) => {
    console.error('❌ Error en conexión MySQL:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Reconectando a MySQL...');
        db.connect();
    } else {
        throw err;
    }
});

module.exports = db;