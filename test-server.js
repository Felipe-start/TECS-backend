const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = 3000;

// ============================================
// CONFIGURACIÓN DE BASE DE DATOS
// ============================================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'sistema_tec',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err);
        process.exit(1);
    }
    console.log('✅ Conectado a MySQL');
});

// ============================================
// CONFIGURACIÓN CORS PERMISIVA
// ============================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================
// MIDDLEWARE DE LOG PARA DEBUG
// ============================================
app.use((req, res, next) => {
    console.log('\n📨', new Date().toISOString(), req.method, req.url);
    console.log('Headers:', {
        origin: req.headers.origin,
        authorization: req.headers.authorization ? 'Presente' : 'Ausente'
    });
    next();
});

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN SIMPLIFICADO
// ============================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ Token no proporcionado');
        return res.status(401).json({
            success: false,
            message: 'Token no proporcionado'
        });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('🔐 Token recibido:', token);
    
    // Token simple: "user-{id}"
    if (token.startsWith('user-')) {
        const userId = token.split('-')[1];
        req.user = { userId: parseInt(userId) };
        console.log('✅ Usuario autenticado:', req.user);
        next();
    } else {
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
};

// ============================================
// RUTAS PÚBLICAS (NO requieren token)
// ============================================

// ✅ LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 Login attempt:', email);
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña requeridos'
            });
        }
        
        // Buscar usuario
        const [users] = await db.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        const user = users[0];
        
        // Comparar contraseña (sin hash por simplicidad)
        if (password !== user.password) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }
        
        // Generar token simple
        const token = `user-${user.id}`;
        
        console.log('✅ Login exitoso para:', email);
        
        res.json({
            success: true,
            message: 'Login exitoso',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                nombreCompleto: user.nombre_completo || '',
                telefono: user.telefono || '',
                institucion: user.institucion || ''
            }
        });
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// ✅ CARRERAS DISPONIBLES (pública)
app.get('/api/careers/available', async (req, res) => {
    try {
        const [careers] = await db.promise().query(
            'SELECT * FROM careers WHERE activa = 1 ORDER BY nombre'
        );
        
        res.json({
            success: true,
            data: careers,
            count: careers.length
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo carreras:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo carreras'
        });
    }
});

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '✅ Servidor funcionando',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// RUTAS PROTEGIDAS (requieren token)
// ============================================

// ✅ OBTENER INSTITUCIONES DEL USUARIO
app.get('/api/institutions/my-institutions', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [institutions] = await db.promise().query(
            'SELECT * FROM institutions WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        res.json({
            success: true,
            institutions: institutions,
            count: institutions.length
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo instituciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo instituciones'
        });
    }
});

// ✅ CREAR INSTITUCIÓN
app.post('/api/institutions', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { nombre, claveCCT, telefono, correo, direccion } = req.body;
        
        if (!nombre || !claveCCT) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y clave CCT son requeridos'
            });
        }
        
        // Insertar institución
        const [result] = await db.promise().query(
            `INSERT INTO institutions (user_id, nombre, clave_cct, telefono, correo, direccion) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, nombre, claveCCT, telefono || '', correo || '', direccion || '']
        );
        
        // Obtener institución creada
        const [institution] = await db.promise().query(
            'SELECT * FROM institutions WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            message: 'Institución creada exitosamente',
            institution: institution[0]
        });
        
    } catch (error) {
        console.error('❌ Error creando institución:', error);
        
        // Manejar error de duplicado
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'La clave CCT ya existe'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creando institución'
        });
    }
});

// ✅ OBTENER CARRERAS DEL USUARIO
app.get('/api/careers/my-careers', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [careers] = await db.promise().query(
            'SELECT * FROM careers WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        res.json({
            success: true,
            data: careers,
            count: careers.length
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo carreras:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo carreras'
        });
    }
});

// ✅ CREAR CARRERA
app.post('/api/careers', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { nombre, numeroCarrera, cantidadAlumnos, descripcion } = req.body;
        
        if (!nombre || !numeroCarrera) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y número de carrera son requeridos'
            });
        }
        
        // Insertar carrera
        const [result] = await db.promise().query(
            `INSERT INTO careers (user_id, nombre, numero_carrera, cantidad_alumnos, descripcion, fecha_registro) 
             VALUES (?, ?, ?, ?, ?, CURDATE())`,
            [userId, nombre, numeroCarrera, cantidadAlumnos || 0, descripcion || '']
        );
        
        // Obtener carrera creada
        const [career] = await db.promise().query(
            'SELECT * FROM careers WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            success: true,
            message: 'Carrera creada exitosamente',
            career: career[0]
        });
        
    } catch (error) {
        console.error('❌ Error creando carrera:', error);
        
        // Manejar error de duplicado
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'El número de carrera ya existe'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creando carrera'
        });
    }
});

// ============================================
// RUTA RAIZ
// ============================================
app.get('/', (req, res) => {
    res.json({
        message: 'API Sistema TEC - Versión Simple',
        version: '1.0.0',
        endpoints: {
            public: {
                login: 'POST /api/auth/login',
                careers_available: 'GET /api/careers/available',
                health: 'GET /api/health'
            },
            protected: {
                my_institutions: 'GET /api/institutions/my-institutions',
                create_institution: 'POST /api/institutions',
                my_careers: 'GET /api/careers/my-careers',
                create_career: 'POST /api/careers'
            }
        },
        note: 'Las rutas protegidas requieren: Authorization: Bearer user-{id}'
    });
});

// ============================================
// MANEJO DE ERRORES 404
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.url}`,
        available_endpoints: [
            'POST /api/auth/login',
            'GET /api/careers/available',
            'GET /api/health',
            'GET /api/institutions/my-institutions',
            'POST /api/institutions',
            'GET /api/careers/my-careers',
            'POST /api/careers'
        ]
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ============================================
    🚀 SERVIDOR TEC SIMPLE INICIADO
    ============================================
    🌐 URL: http://localhost:${PORT}
    🌐 URL Pública: https://scaling-barnacle-97j97j6vrrwj2p7pp-3000.app.github.dev
    🔧 Base de datos: MySQL (sistema_tec)
    ⏰ Hora: ${new Date().toLocaleString()}
    ============================================
    `);
});