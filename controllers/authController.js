const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

class AuthController {
    // ✅ REGISTRO - Método principal
    static async register(req, res) {
        try {
            const { 
                email, 
                password, 
                nombreCompleto, 
                telefono, 
                institucion,
                username 
            } = req.body;
            
            console.log('📝 Datos de registro recibidos:', req.body);
            
            // Validaciones básicas
            if (!email || !password || !nombreCompleto) {
                return res.status(400).json({
                    success: false,
                    message: 'Email, contraseña y nombre son requeridos'
                });
            }
            
            // Verificar si el email ya existe
            const [existing] = await db.promise().query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está registrado'
                });
            }
            
            // Generar username si no viene
            const finalUsername = username || email.split('@')[0];
            
            // Hash de la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insertar usuario
            const [result] = await db.promise().query(
                `INSERT INTO users (username, email, password, nombre_completo, telefono, institucion, role) 
                 VALUES (?, ?, ?, ?, ?, ?, 'user')`,
                [finalUsername, email, hashedPassword, nombreCompleto, telefono, institucion]
            );
            
            console.log('✅ Usuario insertado, ID:', result.insertId);
            
            // Obtener usuario creado
            const [newUser] = await db.promise().query(
                'SELECT * FROM users WHERE id = ?',
                [result.insertId]
            );
            
            // Generar token automáticamente después del registro
            const token = jwt.sign(
                { 
                    userId: newUser[0].id,
                    email: newUser[0].email,
                    role: newUser[0].role,
                    username: newUser[0].username,
                    nombreCompleto: newUser[0].nombre_completo,
                    institucion: newUser[0].institucion || null
                },
                process.env.JWT_SECRET || 'clave_simple_tec_2024',
                { expiresIn: '8h' }
            );
            
            res.status(201).json({
                success: true,
                message: 'Usuario registrado exitosamente',
                token: token,
                user: {
                    id: newUser[0].id,
                    username: newUser[0].username,
                    email: newUser[0].email,
                    role: newUser[0].role,
                    nombreCompleto: newUser[0].nombre_completo || '',
                    telefono: newUser[0].telefono || '',
                    institucion: newUser[0].institucion || '',
                    avatar: newUser[0].avatar || null
                }
            });
            
        } catch (error) {
            console.error('❌ Error en registro:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ LOGIN - Método actualizado
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            
            console.log('🔐 Intento de login para:', email);
            
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
                console.log('❌ Usuario no encontrado:', email);
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }
            
            const user = users[0];
            console.log('👤 Usuario encontrado:', user.id, user.email);
            
            // Verificar contraseña
            let isValidPassword = false;
            
            try {
                // Intentar con bcrypt primero
                isValidPassword = await bcrypt.compare(password, user.password);
                
                // Si falla bcrypt pero la contraseña coincide directamente (para migración)
                if (!isValidPassword && password === user.password) {
                    console.log('⚠️ Usando contraseña sin hash (migración)');
                    isValidPassword = true;
                    
                    // Actualizar a hash bcrypt
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await db.promise().query(
                        'UPDATE users SET password = ? WHERE id = ?',
                        [hashedPassword, user.id]
                    );
                    console.log('✅ Contraseña actualizada a hash bcrypt');
                }
            } catch (bcryptError) {
                console.error('❌ Error en bcrypt:', bcryptError);
                // Si hay error en bcrypt, intentar comparación directa
                isValidPassword = (password === user.password);
            }
            
            if (!isValidPassword) {
                console.log('❌ Contraseña incorrecta para:', email);
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }
            
            // Generar token
            const token = jwt.sign(
                { 
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    username: user.username,
                    nombreCompleto: user.nombre_completo,
                    institucion: user.institucion || null
                },
                process.env.JWT_SECRET || 'clave_simple_tec_2024',
                { expiresIn: '8h' }
            );
            
            console.log('✅ Login exitoso, token generado para:', user.email);
            
            // Enviar respuesta
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
                    institucion: user.institucion || '',
                    avatar: user.avatar || null
                }
            });
            
        } catch (error) {
            console.error('❌ Error en login:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ PERFIL DEL USUARIO
    static async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            
            const [rows] = await db.promise().query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            
            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }
            
            const user = rows[0];
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    nombreCompleto: user.nombre_completo || '',
                    telefono: user.telefono || '',
                    institucion: user.institucion || '',
                    avatar: user.avatar || null
                }
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo perfil:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
    }

    // ✅ VERIFICAR TOKEN
    static async verify(req, res) {
        try {
            const userId = req.user.userId;
            
            const [rows] = await db.promise().query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            
            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }
            
            const user = rows[0];
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    nombreCompleto: user.nombre_completo || '',
                    telefono: user.telefono || '',
                    institucion: user.institucion || '',
                    avatar: user.avatar || null
                }
            });
            
        } catch (error) {
            console.error('❌ Error verificando token:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
    }

    // ✅ OBTENER TODOS LOS USUARIOS (solo admin)
    static async getAllUsers(req, res) {
        try {
            const [users] = await db.promise().query(
                'SELECT id, username, email, role, nombre_completo, telefono, institucion, created_at FROM users ORDER BY created_at DESC'
            );
            
            res.json({
                success: true,
                users: users,
                count: users.length
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo usuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
    }

    // ✅ ACTUALIZAR PERFIL DEL USUARIO
    static async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { 
                username, 
                email, 
                nombreCompleto, 
                telefono, 
                institucion,
                avatar 
            } = req.body;
            
            console.log('📝 Actualizando perfil para usuario ID:', userId);
            console.log('📋 Datos recibidos:', req.body);
            
            // Verificar si el usuario existe
            const [users] = await db.promise().query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }
            
            // Verificar si el email ya existe (si se está cambiando)
            if (email && email !== users[0].email) {
                const [existingEmail] = await db.promise().query(
                    'SELECT id FROM users WHERE email = ? AND id != ?',
                    [email, userId]
                );
                
                if (existingEmail.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'El email ya está en uso por otro usuario'
                    });
                }
            }
            
            // Verificar si el username ya existe (si se está cambiando)
            if (username && username !== users[0].username) {
                const [existingUsername] = await db.promise().query(
                    'SELECT id FROM users WHERE username = ? AND id != ?',
                    [username, userId]
                );
                
                if (existingUsername.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'El nombre de usuario ya está en uso'
                    });
                }
            }
            
            // Construir query de actualización dinámica
            const updates = [];
            const values = [];
            
            if (username !== undefined) {
                updates.push('username = ?');
                values.push(username);
            }
            
            if (email !== undefined) {
                updates.push('email = ?');
                values.push(email);
            }
            
            if (nombreCompleto !== undefined) {
                updates.push('nombre_completo = ?');
                values.push(nombreCompleto);
            }
            
            if (telefono !== undefined) {
                updates.push('telefono = ?');
                values.push(telefono);
            }
            
            if (institucion !== undefined) {
                updates.push('institucion = ?');
                values.push(institucion);
            }
            
            if (avatar !== undefined) {
                updates.push('avatar = ?');
                values.push(avatar);
            }
            
            // Si no hay nada para actualizar
            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No hay datos para actualizar'
                });
            }
            
            // Agregar ID al final
            values.push(userId);
            
            // Ejecutar actualización
            const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
            await db.promise().query(query, values);
            
            // Obtener usuario actualizado
            const [updatedUser] = await db.promise().query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            
            console.log('✅ Perfil actualizado exitosamente');
            
            res.json({
                success: true,
                message: 'Perfil actualizado exitosamente',
                user: {
                    id: updatedUser[0].id,
                    username: updatedUser[0].username,
                    email: updatedUser[0].email,
                    role: updatedUser[0].role,
                    nombreCompleto: updatedUser[0].nombre_completo || '',
                    telefono: updatedUser[0].telefono || '',
                    institucion: updatedUser[0].institucion || '',
                    avatar: updatedUser[0].avatar || null,
                    numeroTrabajador: updatedUser[0].numero_trabajador || null
                }
            });
            
        } catch (error) {
            console.error('❌ Error actualizando perfil:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ CAMBIAR CONTRASEÑA
    static async changePassword(req, res) {
        try {
            const userId = req.user.userId;
            const { currentPassword, newPassword } = req.body;
            
            console.log('🔑 Cambiando contraseña para usuario ID:', userId);
            
            // Validar campos
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'La contraseña actual y la nueva contraseña son requeridas'
                });
            }
            
            // Obtener usuario
            const [users] = await db.promise().query(
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
            let isPasswordValid = false;
            
            try {
                // Intentar con bcrypt
                isPasswordValid = await bcrypt.compare(currentPassword, user.password);
                
                // Si falla bcrypt pero coincide directamente (para migración)
                if (!isPasswordValid && currentPassword === user.password) {
                    console.log('⚠️ Usando contraseña sin hash para verificación (migración)');
                    isPasswordValid = true;
                }
            } catch (bcryptError) {
                console.error('❌ Error en bcrypt compare:', bcryptError);
                // Si hay error en bcrypt, intentar comparación directa
                isPasswordValid = (currentPassword === user.password);
            }
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'La contraseña actual es incorrecta'
                });
            }
            
            // Validar nueva contraseña (mínimo 6 caracteres)
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'La nueva contraseña debe tener al menos 6 caracteres'
                });
            }
            
            // Hash de nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // Actualizar contraseña
            await db.promise().query(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
                [hashedPassword, userId]
            );
            
            console.log('✅ Contraseña cambiada exitosamente');
            
            res.json({
                success: true,
                message: 'Contraseña cambiada exitosamente'
            });
            
        } catch (error) {
            console.error('❌ Error cambiando contraseña:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ ACTUALIZAR SOLO AVATAR
    static async updateAvatar(req, res) {
        try {
            const userId = req.user.userId;
            const { avatar } = req.body;
            
            console.log('🖼️ Actualizando avatar para usuario ID:', userId);
            
            if (!avatar) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere una imagen de avatar'
                });
            }
            
            // Verificar si el usuario existe
            const [users] = await db.promise().query(
                'SELECT id FROM users WHERE id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }
            
            // Actualizar avatar
            await db.promise().query(
                'UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?',
                [avatar, userId]
            );
            
            // Obtener usuario actualizado
            const [updatedUser] = await db.promise().query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            
            console.log('✅ Avatar actualizado exitosamente');
            
            res.json({
                success: true,
                message: 'Avatar actualizado exitosamente',
                user: {
                    id: updatedUser[0].id,
                    username: updatedUser[0].username,
                    email: updatedUser[0].email,
                    role: updatedUser[0].role,
                    nombreCompleto: updatedUser[0].nombre_completo || '',
                    telefono: updatedUser[0].telefono || '',
                    institucion: updatedUser[0].institucion || '',
                    avatar: updatedUser[0].avatar || null
                }
            });
            
        } catch (error) {
            console.error('❌ Error actualizando avatar:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ✅ ACTUALIZAR PERFIL COMPLETO (DATOS + PASSWORD SI SE PROVEE)
    static async updateFullProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { 
                username, 
                email, 
                nombreCompleto, 
                telefono, 
                institucion,
                avatar,
                currentPassword,
                newPassword 
            } = req.body;
            
            console.log('📝 Actualizando perfil completo para usuario ID:', userId);
              if (avatar && avatar.length > 16000000) { // ~16MB para MEDIUMTEXT
            return res.status(400).json({
                success: false,
                message: 'La imagen de avatar es demasiado grande. Máximo 16MB permitido.'
            });
        }
            
            // Primero verificar cambio de contraseña si se proporciona
            if (currentPassword && newPassword) {
                console.log('🔑 Intentando cambiar contraseña...');
                
                // Obtener usuario actual
                const [users] = await db.promise().query(
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
                let isPasswordValid = false;
                
                try {
                    // Intentar con bcrypt
                    isPasswordValid = await bcrypt.compare(currentPassword, user.password);
                    
                    // Si falla bcrypt pero coincide directamente
                    if (!isPasswordValid && currentPassword === user.password) {
                        isPasswordValid = true;
                    }
                } catch (bcryptError) {
                    console.error('❌ Error en bcrypt compare:', bcryptError);
                    isPasswordValid = (currentPassword === user.password);
                }
                
                if (!isPasswordValid) {
                    return res.status(401).json({
                        success: false,
                        message: 'La contraseña actual es incorrecta'
                    });
                }
                
                // Validar nueva contraseña
                if (newPassword.length < 6) {
                    return res.status(400).json({
                        success: false,
                        message: 'La nueva contraseña debe tener al menos 6 caracteres'
                    });
                }
                
                // Hash de nueva contraseña
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                
                // Actualizar contraseña
                await db.promise().query(
                    'UPDATE users SET password = ? WHERE id = ?',
                    [hashedPassword, userId]
                );
                
                console.log('✅ Contraseña cambiada exitosamente');
            }
            
            // Ahora actualizar datos del perfil
            const updates = [];
            const values = [];
            
            if (username !== undefined) {
                updates.push('username = ?');
                values.push(username);
            }
            
            if (email !== undefined) {
                // Verificar si el email ya existe
                if (email) {
                    const [existingEmail] = await db.promise().query(
                        'SELECT id FROM users WHERE email = ? AND id != ?',
                        [email, userId]
                    );
                    
                    if (existingEmail.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'El email ya está en uso por otro usuario'
                        });
                    }
                    updates.push('email = ?');
                    values.push(email);
                }
            }
            
            if (nombreCompleto !== undefined) {
                updates.push('nombre_completo = ?');
                values.push(nombreCompleto);
            }
            
            if (telefono !== undefined) {
                updates.push('telefono = ?');
                values.push(telefono);
            }
            
            if (institucion !== undefined) {
                updates.push('institucion = ?');
                values.push(institucion);
            }
            
            if (avatar !== undefined) {
                updates.push('avatar = ?');
                values.push(avatar);
            }
            
            // Si hay algo para actualizar
            if (updates.length > 0) {
                values.push(userId);
                
                const query = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
                await db.promise().query(query, values);
                console.log('✅ Datos de perfil actualizados');
            }
            
            // Obtener usuario actualizado
            const [updatedUser] = await db.promise().query(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            
            console.log('✅ Perfil completo actualizado exitosamente');
            
            res.json({
                success: true,
                message: 'Perfil actualizado exitosamente',
                user: {
                    id: updatedUser[0].id,
                    username: updatedUser[0].username,
                    email: updatedUser[0].email,
                    role: updatedUser[0].role,
                    nombreCompleto: updatedUser[0].nombre_completo || '',
                    telefono: updatedUser[0].telefono || '',
                    institucion: updatedUser[0].institucion || '',
                    avatar: updatedUser[0].avatar || null
                }
            });
            
        } catch (error) {
            console.error('❌ Error actualizando perfil completo:', error);
            res.status(500).json({
                success: false,
                message: 'Error en el servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

// ✅ Asegúrate de exportar la clase correctamente
module.exports = AuthController;