const db = require('../config/database');

class CareerController {
    // ✅ OBTENER CARRERAS POR USUARIO
    static async getByUser(req, res) {
        try {
            const userId = req.user.userId;
            
            console.log('🎓 Obteniendo carreras para usuario ID:', userId);
            
            const [careers] = await db.promise().query(
                'SELECT * FROM careers WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
            
            console.log(`📊 Encontradas ${careers.length} carreras para usuario ${userId}`);
            
            res.json({
                success: true,
                data: careers,
                count: careers.length
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo carreras:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo carreras: ' + error.message
            });
        }
    }

    // ✅ OBTENER TODAS LAS CARRERAS (solo admin)
    static async getAll(req, res) {
        try {
            const [careers] = await db.promise().query(`
                SELECT c.*, u.username as propietario
                FROM careers c
                LEFT JOIN users u ON c.user_id = u.id
                ORDER BY c.created_at DESC
            `);
            
            res.json({
                success: true,
                data: careers,
                count: careers.length
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo todas las carreras:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo carreras: ' + error.message
            });
        }
    }

    // ✅ CREAR CARRERA CON MÉTRICAS Y LOGO
    static async create(req, res) {
        try {
            const userId = req.user.userId;
            const {
                nombre,
                numeroCarrera,
                cantidadAlumnos,
                duracionSemestres,
                modalidad,
                turno,
                descripcion,
                activa,
                poblacionEsperada,
                poblacionReal,
                logo
            } = req.body;
            
            console.log('📝 Creando carrera para usuario:', userId);
            console.log('📊 Datos recibidos:', req.body);
            
            // Validar campos requeridos
            if (!nombre || !numeroCarrera) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombre y número de carrera son requeridos'
                });
            }
            
            // Verificar si ya existe el número de carrera
            const [existing] = await db.promise().query(
                'SELECT id FROM careers WHERE numero_carrera = ?',
                [numeroCarrera]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El número de carrera ya existe'
                });
            }
            
            // Insertar carrera con TODOS los campos
            const [result] = await db.promise().query(
                `INSERT INTO careers 
                (user_id, nombre, numero_carrera, cantidad_alumnos, 
                 duracion_semestres, modalidad, turno, fecha_registro, 
                 descripcion, activa, poblacion_esperada, poblacion_real, logo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
                [
                    userId, 
                    nombre, 
                    numeroCarrera, 
                    cantidadAlumnos || 0, 
                    duracionSemestres || 8,
                    modalidad || 'Escolarizada',
                    turno || 'Matutino',
                    descripcion || '',
                    activa !== undefined ? (activa ? 1 : 0) : 1,
                    poblacionEsperada || 100,
                    poblacionReal || 50,
                    logo || null
                ]
            );
            
            // Obtener carrera creada
            const [career] = await db.promise().query(
                'SELECT * FROM careers WHERE id = ?',
                [result.insertId]
            );
            
            console.log('✅ Carrera creada exitosamente');
            
            res.status(201).json({
                success: true,
                message: 'Carrera creada exitosamente',
                career: career[0]
            });
            
        } catch (error) {
            console.error('❌ Error creando carrera:', error);
            res.status(500).json({
                success: false,
                message: 'Error creando carrera: ' + error.message
            });
        }
    }

    // ✅ OBTENER CARRERA POR ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            
            const [careers] = await db.promise().query(
                'SELECT * FROM careers WHERE id = ?',
                [id]
            );
            
            if (careers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Carrera no encontrada'
                });
            }
            
            res.json({
                success: true,
                career: careers[0]
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo carrera:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo carrera: ' + error.message
            });
        }
    }

    // ✅ ACTUALIZAR CARRERA COMPLETA
    static async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const updateData = req.body;
            
            console.log(`✏️ Actualizando carrera ${id} para usuario ${userId}`);
            console.log('📊 Datos para actualizar:', updateData);
            
            // Verificar que la carrera existe y pertenece al usuario
            const [career] = await db.promise().query(
                'SELECT * FROM careers WHERE id = ? AND user_id = ?',
                [id, userId]
            );
            
            if (career.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Carrera no encontrada o no tienes permisos'
                });
            }
            
            // Construir query de actualización
            const fields = [];
            const values = [];
            
            // Mapeo de campos frontend a backend
            const fieldMappings = {
                nombre: 'nombre',
                numeroCarrera: 'numero_carrera',
                cantidadAlumnos: 'cantidad_alumnos',
                duracionSemestres: 'duracion_semestres',
                modalidad: 'modalidad',
                turno: 'turno',
                descripcion: 'descripcion',
                activa: 'activa',
                poblacionEsperada: 'poblacion_esperada',
                poblacionReal: 'poblacion_real',
                logo: 'logo'
            };
            
            for (const [frontendField, backendField] of Object.entries(fieldMappings)) {
                if (updateData[frontendField] !== undefined) {
                    fields.push(`${backendField} = ?`);
                    
                    // Manejar valores booleanos para activa
                    if (frontendField === 'activa') {
                        values.push(updateData[frontendField] ? 1 : 0);
                    } else {
                        values.push(updateData[frontendField]);
                    }
                }
            }
            
            if (fields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No hay datos para actualizar'
                });
            }
            
            values.push(id, userId);
            
            const query = `UPDATE careers SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ?`;
            
            await db.promise().query(query, values);
            
            console.log('✅ Carrera actualizada exitosamente');
            
            res.json({
                success: true,
                message: 'Carrera actualizada exitosamente'
            });
            
        } catch (error) {
            console.error('❌ Error actualizando carrera:', error);
            res.status(500).json({
                success: false,
                message: 'Error actualizando carrera: ' + error.message
            });
        }
    }

    // ✅ ACTUALIZAR SOLO MÉTRICAS DE CARRERA
    static async updateMetrics(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { poblacionEsperada, poblacionReal } = req.body;
            
            console.log(`📈 Actualizando métricas para carrera ${id}, usuario: ${userId}`);
            console.log('📊 Datos recibidos:', { poblacionEsperada, poblacionReal });
            
            // Verificar que la carrera existe y pertenece al usuario
            const [career] = await db.promise().query(
                'SELECT id FROM careers WHERE id = ? AND user_id = ?',
                [id, userId]
            );
            
            if (career.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Carrera no encontrada o no tienes permisos'
                });
            }
            
            // Validar métricas
            if (poblacionEsperada === undefined || poblacionReal === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Ambas métricas (poblacionEsperada y poblacionReal) son requeridas'
                });
            }
            
            // Actualizar métricas
            await db.promise().query(
                'UPDATE careers SET poblacion_esperada = ?, poblacion_real = ?, updated_at = NOW() WHERE id = ?',
                [poblacionEsperada, poblacionReal, id]
            );
            
            console.log('✅ Métricas actualizadas exitosamente');
            
            res.json({
                success: true,
                message: 'Métricas actualizadas exitosamente'
            });
            
        } catch (error) {
            console.error('❌ Error actualizando métricas:', error);
            res.status(500).json({
                success: false,
                message: 'Error actualizando métricas: ' + error.message
            });
        }
    }

    // ✅ ELIMINAR CARRERA
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            
            console.log(`🗑️ Eliminando carrera ${id} para usuario ${userId}`);
            
            // Verificar que la carrera existe y pertenece al usuario
            const [career] = await db.promise().query(
                'SELECT id FROM careers WHERE id = ? AND user_id = ?',
                [id, userId]
            );
            
            if (career.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Carrera no encontrada o no tienes permisos'
                });
            }
            
            // Eliminar relaciones primero
            await db.promise().query(
                'DELETE FROM institution_careers WHERE career_id = ?',
                [id]
            );
            
            // Eliminar carrera
            await db.promise().query(
                'DELETE FROM careers WHERE id = ?',
                [id]
            );
            
            console.log('✅ Carrera eliminada exitosamente');
            
            res.json({
                success: true,
                message: 'Carrera eliminada exitosamente'
            });
            
        } catch (error) {
            console.error('❌ Error eliminando carrera:', error);
            res.status(500).json({
                success: false,
                message: 'Error eliminando carrera: ' + error.message
            });
        }
    }

    // ✅ OBTENER CARRERAS DISPONIBLES (sin autenticación)
    static async getAvailable(req, res) {
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
            console.error('❌ Error obteniendo carreras disponibles:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo carreras disponibles: ' + error.message
            });
        }
    }

    // ✅ OBTENER ESTADÍSTICAS DE CARRERAS
    static async getStats(req, res) {
        try {
            const [stats] = await db.promise().query(`
                SELECT 
                    COUNT(*) as total_careers,
                    SUM(CASE WHEN activa = 1 THEN 1 ELSE 0 END) as active_careers,
                    SUM(CASE WHEN activa = 0 THEN 1 ELSE 0 END) as inactive_careers,
                    SUM(poblacion_esperada) as total_poblacion_esperada,
                    SUM(poblacion_real) as total_poblacion_real,
                    AVG(poblacion_esperada) as promedio_esperada,
                    AVG(poblacion_real) as promedio_real,
                    modalidad,
                    COUNT(*) as count_by_modalidad
                FROM careers
                GROUP BY modalidad
            `);
            
            const [turnoStats] = await db.promise().query(`
                SELECT turno, COUNT(*) as count_by_turno
                FROM careers
                GROUP BY turno
            `);
            
            const totalEsperada = stats.reduce((sum, s) => sum + (s.total_poblacion_esperada || 0), 0);
            const totalReal = stats.reduce((sum, s) => sum + (s.total_poblacion_real || 0), 0);
            const porcentajeCumplimiento = totalEsperada > 0 ? (totalReal / totalEsperada) * 100 : 0;
            
            res.json({
                success: true,
                statistics: {
                    totalCareers: stats.reduce((sum, s) => sum + s.total_careers, 0) || 0,
                    activeCareers: stats.reduce((sum, s) => sum + s.active_careers, 0) || 0,
                    inactiveCareers: stats.reduce((sum, s) => sum + s.inactive_careers, 0) || 0,
                    totalPoblacionEsperada: totalEsperada,
                    totalPoblacionReal: totalReal,
                    promedioPoblacionEsperada: stats.reduce((sum, s) => sum + (s.promedio_esperada || 0), 0) / stats.length || 0,
                    promedioPoblacionReal: stats.reduce((sum, s) => sum + (s.promedio_real || 0), 0) / stats.length || 0,
                    porcentajeCumplimiento: porcentajeCumplimiento.toFixed(2),
                    careersByModalidad: stats.reduce((obj, s) => {
                        obj[s.modalidad] = s.count_by_modalidad;
                        return obj;
                    }, {}),
                    careersByTurno: turnoStats.reduce((obj, s) => {
                        obj[s.turno] = s.count_by_turno;
                        return obj;
                    }, {})
                }
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo estadísticas: ' + error.message
            });
        }
    }
}

module.exports = CareerController;