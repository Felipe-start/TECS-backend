const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // ✅ Crear usuario con validación de número de trabajador
    static async create(userData) {
        const { 
            username, 
            email, 
            password, 
            role, 
            nombreCompleto, 
            telefono, 
            institucion, 
            avatar,
            numeroTrabajador 
        } = userData;
        
        try {
            // Verificar si el usuario ya existe por email
            const [existingUser] = await db.promise().query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUser.length > 0) {
                throw new Error('El usuario con este email ya existe');
            }

            // Verificar número de trabajador si es admin
            if (role === 'admin' && numeroTrabajador) {
                const [existingWorker] = await db.promise().query(
                    'SELECT id FROM users WHERE numero_trabajador = ?',
                    [numeroTrabajador]
                );

                if (existingWorker.length > 0) {
                    throw new Error('El número de trabajador ya existe');
                }
            }

            // Hash de la contraseña
               const hashedPassword = await bcrypt.hash(password, 10);

            // Insertar usuario
            const [result] = await db.promise().query(
                `INSERT INTO users (
                    username, email, password, role, nombre_completo, 
                    telefono, institucion, avatar, numero_trabajador, 
                    is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
                [
                    username, email, hashedPassword, role, nombreCompleto, 
                    telefono, institucion, avatar, numeroTrabajador || null
                ]
            );

            return {
                id: result.insertId,
                username,
                email,
                role,
                nombre_completo: nombreCompleto,
                telefono,
                institucion,
                avatar,
                numero_trabajador: numeroTrabajador,
                is_active: 1,
                created_at: new Date(),
                updated_at: new Date()
            };
        } catch (error) {
            throw error;
        }
    }

    // ✅ Buscar por email
    static async findByEmail(email) {
        try {
            const [rows] = await db.promise().query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Buscar por ID
    static async findById(id) {
        try {
            const [rows] = await db.promise().query(
                'SELECT * FROM users WHERE id = ?',
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Buscar por número de trabajador
    static async findByWorkerNumber(numeroTrabajador) {
        try {
            const [rows] = await db.promise().query(
                'SELECT * FROM users WHERE numero_trabajador = ?',
                [numeroTrabajador]
            );
            return rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Actualizar usuario
    static async update(id, updateData) {
        const { 
            nombreCompleto, 
            telefono, 
            institucion, 
            numeroTrabajador 
        } = updateData;
        
        try {
            let query = `UPDATE users 
                         SET nombre_completo = ?, telefono = ?, institucion = ?, 
                         updated_at = NOW()`;
            let params = [nombreCompleto, telefono, institucion];

            if (numeroTrabajador !== undefined) {
                query += ', numero_trabajador = ?';
                params.push(numeroTrabajador);
            }

            query += ' WHERE id = ?';
            params.push(id);

            await db.promise().query(query, params);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Actualizar avatar
    static async updateAvatar(id, avatar) {
        try {
            await db.promise().query(
                'UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?',
                [avatar, id]
            );
            return true;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Cambiar contraseña
    static async updatePassword(id, currentPassword, newPassword) {
        try {
            // Obtener usuario actual
            const user = await this.findById(id);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            // Verificar contraseña actual
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                throw new Error('La contraseña actual es incorrecta');
            }

            // Hash de nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Actualizar contraseña
            await db.promise().query(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
                [hashedPassword, id]
            );

            return true;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Obtener avatar
    static async getAvatar(id) {
        try {
            const [rows] = await db.promise().query(
                'SELECT avatar FROM users WHERE id = ?',
                [id]
            );
            return rows[0]?.avatar || null;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Obtener todos los usuarios
    static async findAll() {
        try {
            const [rows] = await db.promise().query(
                'SELECT * FROM users ORDER BY created_at DESC'
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Actualizar rol (con número de trabajador si es admin)
    static async updateRole(id, role, numeroTrabajador = null) {
        try {
            let query = 'UPDATE users SET role = ?, updated_at = NOW()';
            let params = [role];

            if (role === 'admin' && numeroTrabajador) {
                query += ', numero_trabajador = ?';
                params.push(numeroTrabajador);
            } else if (role === 'user') {
                query += ', numero_trabajador = NULL';
            }

            query += ' WHERE id = ?';
            params.push(id);

            await db.promise().query(query, params);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Eliminar usuario
    static async delete(id) {
        try {
            const [result] = await db.promise().query(
                'DELETE FROM users WHERE id = ?',
                [id]
            );
            return result;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Buscar usuarios
    static async search(searchTerm) {
        try {
            const [rows] = await db.promise().query(
                `SELECT * FROM users 
                 WHERE email LIKE ? OR username LIKE ? OR nombre_completo LIKE ?
                    OR numero_trabajador LIKE ?
                 ORDER BY created_at DESC`,
                [
                    `%${searchTerm}%`, 
                    `%${searchTerm}%`, 
                    `%${searchTerm}%`,
                    `%${searchTerm}%`
                ]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Obtener estadísticas
    static async getStats() {
        try {
            const [total] = await db.promise().query('SELECT COUNT(*) as total FROM users');
            const [admins] = await db.promise().query("SELECT COUNT(*) as admins FROM users WHERE role = 'admin'");
            const [active] = await db.promise().query('SELECT COUNT(*) as active FROM users WHERE is_active = 1');
            const [withWorkerNumber] = await db.promise().query(
                'SELECT COUNT(*) as with_worker FROM users WHERE numero_trabajador IS NOT NULL'
            );
            
            return {
                totalUsers: total[0].total,
                totalAdmins: admins[0].admins,
                totalNormalUsers: total[0].total - admins[0].admins,
                activeUsers: active[0].active,
                inactiveUsers: total[0].total - active[0].active,
                usersWithWorkerNumber: withWorkerNumber[0].with_worker
            };
        } catch (error) {
            throw error;
        }
    }

    // ✅ Activar/desactivar usuario
    static async toggleStatus(id, isActive) {
        try {
            await db.promise().query(
                'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
                [isActive ? 1 : 0, id]
            );
            return true;
        } catch (error) {
            throw error;
        }
    }

    // ✅ Obtener usuarios por rol
    static async findByRole(role) {
        try {
            const [rows] = await db.promise().query(
                'SELECT * FROM users WHERE role = ? ORDER BY nombre_completo',
                [role]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = User;