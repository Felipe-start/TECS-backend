const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const register = async (req, res) => {
  try {
    const { email, password, nombreCompleto, telefono, institucion } = req.body;

    console.log('📝 Datos de registro recibidos:', { email, nombreCompleto, telefono, institucion });

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El usuario con este email ya existe'
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generar username a partir del email
    const username = email.split('@')[0];

    // Insertar usuario en la base de datos
    const [result] = await db.execute(
      `INSERT INTO users (username, email, password, role, nombre_completo, telefono, institucion, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, 'user', ?, ?, ?, 1, NOW(), NOW())`,
      [username, email, hashedPassword, nombreCompleto, telefono, institucion]
    );

    console.log('✅ Usuario insertado, ID:', result.insertId);

    // Obtener el usuario creado (sin avatar para evitar problemas)
    const [users] = await db.execute(
      'SELECT id, username, email, role, nombre_completo, telefono, institucion, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    if (users.length === 0) {
      throw new Error('No se pudo recuperar el usuario recién creado');
    }

    const user = users[0];

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'tec-secret-key-2024',
      { expiresIn: '24h' }
    );

    console.log('✅ Usuario registrado exitosamente:', user.email);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nombreCompleto: user.nombre_completo,
        telefono: user.telefono,
        institucion: user.institucion,
        avatar: null, // No incluimos avatar en el registro
        isActive: user.is_active,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error en registro:', error);
    console.error('❌ Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Intento de login:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email (sin avatar para evitar problemas de tamaño)
    const [users] = await db.execute(
      'SELECT id, username, email, password, role, nombre_completo, telefono, institucion, is_active, created_at FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0];

    // Verificar si el usuario está activo
    if (user.is_active !== 1) {
      console.log('❌ Cuenta desactivada:', email);
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ Contraseña incorrecta para:', email);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'tec-secret-key-2024',
      { expiresIn: '24h' }
    );

    console.log('✅ Login exitoso:', user.email);

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nombreCompleto: user.nombre_completo,
        telefono: user.telefono,
        institucion: user.institucion,
        avatar: null, // No incluimos avatar en login
        isActive: user.is_active === 1,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

const getProfile = async (req, res) => {
  try {
    // Verificar autenticación
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'tec-secret-key-2024');
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    const userId = decoded.userId;

    console.log('👤 Obteniendo perfil para usuario ID:', userId);

    // Obtener perfil completo incluyendo avatar
    const [users] = await db.execute(
      'SELECT id, username, email, role, nombre_completo, telefono, institucion, avatar, is_active, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = users[0];

    // Si el avatar es muy grande, lo truncamos para la respuesta
    let avatar = user.avatar;
    if (avatar && avatar.length > 1000) {
      // Para respuestas JSON, podemos enviar solo un indicador de que tiene avatar
      avatar = 'has_avatar';
    }

    res.json({
      success: true,
      message: 'Perfil obtenido exitosamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nombreCompleto: user.nombre_completo,
        telefono: user.telefono,
        institucion: user.institucion,
        avatar: avatar,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    // Verificar autenticación
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'tec-secret-key-2024');
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    const userId = decoded.userId;
    const { nombreCompleto, telefono, institucion } = req.body;

    console.log('📝 Actualizando perfil para usuario ID:', userId, { nombreCompleto, telefono, institucion });

    await db.execute(
      'UPDATE users SET nombre_completo = ?, telefono = ?, institucion = ?, updated_at = NOW() WHERE id = ?',
      [nombreCompleto, telefono, institucion, userId]
    );

    // Obtener usuario actualizado (sin avatar para evitar problemas)
    const [users] = await db.execute(
      'SELECT id, username, email, role, nombre_completo, telefono, institucion, is_active, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];

    console.log('✅ Perfil actualizado exitosamente:', user.email);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        nombreCompleto: user.nombre_completo,
        telefono: user.telefono,
        institucion: user.institucion,
        avatar: null,
        isActive: user.is_active === 1,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

const changePassword = async (req, res) => {
  try {
    // Verificar autenticación
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'tec-secret-key-2024');
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    const userId = decoded.userId;
    const { currentPassword, newPassword } = req.body;

    console.log('🔑 Cambiando contraseña para usuario ID:', userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual y nueva son requeridas'
      });
    }

    // Obtener usuario actual
    const [users] = await db.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = users[0];

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    // Hash de la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña
    await db.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    console.log('✅ Contraseña cambiada exitosamente para usuario ID:', userId);

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

// Endpoint separado para obtener solo el avatar
const getAvatar = async (req, res) => {
  try {
    const userId = req.params.userId;

    const [users] = await db.execute(
      'SELECT avatar FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || !users[0].avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar no encontrado'
      });
    }

    const user = users[0];
    
    // Enviar el avatar como respuesta directa
    res.json({
      success: true,
      avatar: user.avatar
    });

  } catch (error) {
    console.error('❌ Error obteniendo avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getAvatar
};