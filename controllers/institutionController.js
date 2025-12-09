const db = require('../config/database');

class InstitutionController {
    // ✅ OBTENER INSTITUCIONES POR USUARIO
    static async getByUser(req, res) {
        try {
            const userId = req.user.userId;
            
            console.log('📋 Obteniendo instituciones para usuario ID:', userId);
            
            const [institutions] = await db.promise().query(
                'SELECT * FROM institutions WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
            
            console.log(`📊 Encontradas ${institutions.length} instituciones para usuario ${userId}`);
            
            // También obtener las carreras asociadas a cada institución
            const institutionsWithCareers = await Promise.all(
                institutions.map(async (institution) => {
                    const [careers] = await db.promise().query(
                        `SELECT c.* FROM careers c
                         JOIN institution_careers ic ON c.id = ic.career_id
                         WHERE ic.institution_id = ?`,
                        [institution.id]
                    );
                    
                    return {
                        ...institution,
                        carreras: careers.map(c => ({
                            id: c.id,
                            nombre: c.nombre,
                            numeroCarrera: c.numero_carrera
                        }))
                    };
                })
            );
            
            res.json({
                success: true,
                data: institutionsWithCareers,
                count: institutions.length
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo instituciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo instituciones: ' + error.message
            });
        }
    }

    // ✅ OBTENER INSTITUCIÓN POR ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            
            console.log('🔍 Obteniendo institución ID:', id, 'para usuario:', userId);
            
            const [institutions] = await db.promise().query(
                'SELECT * FROM institutions WHERE id = ? AND user_id = ?',
                [id, userId]
            );
            
            if (institutions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Institución no encontrada o no tienes permisos'
                });
            }
            
            const institution = institutions[0];
            
            // Obtener carreras asociadas
            const [careers] = await db.promise().query(
                `SELECT c.* FROM careers c
                 JOIN institution_careers ic ON c.id = ic.career_id
                 WHERE ic.institution_id = ?`,
                [id]
            );
            
            const institutionWithCareers = {
                ...institution,
                carreras: careers.map(c => ({
                    id: c.id,
                    nombre: c.nombre,
                    numeroCarrera: c.numero_carrera
                }))
            };
            
            res.json({
                success: true,
                data: institutionWithCareers
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo institución:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo institución: ' + error.message
            });
        }
    }

    // ✅ CREAR INSTITUCIÓN
    static async create(req, res) {
        try {
            const userId = req.user.userId;
            const {
                nombre,
                claveCCT,
                telefono,
                extension,
                correo,
                nombreRepresentante,
                puestoRepresentante,
                direccion,
                logo,
                estado,
                carreras
            } = req.body;
            
            console.log('🏫 Creando institución para usuario:', userId);
            console.log('📋 Datos recibidos:', { 
                nombre, 
                claveCCT, 
                carrerasCount: carreras?.length || 0 
            });
            
            // Validar campos requeridos
            if (!nombre || !claveCCT) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombre y clave CCT son requeridos'
                });
            }
            
            // Verificar si la clave CCT ya existe
            const [existing] = await db.promise().query(
                'SELECT id FROM institutions WHERE clave_cct = ?',
                [claveCCT]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La clave CCT ya existe'
                });
            }
            
            // Insertar institución
            const [result] = await db.promise().query(
                `INSERT INTO institutions 
                (user_id, nombre, clave_cct, telefono, extension, correo, 
                 nombre_representante, puesto_representante, direccion, logo, estado) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, nombre, claveCCT, telefono || null, extension || null,
                    correo || null, nombreRepresentante || null, puestoRepresentante || null,
                    direccion || null, logo || null, estado || 'active'
                ]
            );
            
            const institutionId = result.insertId;
            console.log('✅ Institución creada con ID:', institutionId);
            
            // Asociar carreras si se proporcionaron
            if (carreras && carreras.length > 0) {
                console.log('🎓 Asociando', carreras.length, 'carreras a la institución');
                
                for (const careerId of carreras) {
                    try {
                        await db.promise().query(
                            'INSERT INTO institution_careers (institution_id, career_id) VALUES (?, ?)',
                            [institutionId, careerId]
                        );
                    } catch (error) {
                        console.warn(`⚠️ No se pudo asociar carrera ${careerId}:`, error.message);
                    }
                }
            }
            
            // Obtener institución creada
            const [newInstitution] = await db.promise().query(
                'SELECT * FROM institutions WHERE id = ?',
                [institutionId]
            );
            
            res.status(201).json({
                success: true,
                message: 'Institución creada exitosamente',
                data: newInstitution[0]
            });
            
        } catch (error) {
            console.error('❌ Error creando institución:', error);
            res.status(500).json({
                success: false,
                message: 'Error creando institución: ' + error.message
            });
        }
    }

    // ✅ ACTUALIZAR INSTITUCIÓN - VERSIÓN CORREGIDA
    static async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const updateData = req.body;
            
            console.log(`✏️ Actualizando institución ${id} para usuario ${userId}`);
            console.log('📊 Datos para actualizar:', updateData);
            
            // Verificar que la institución existe y pertenece al usuario
            const [institution] = await db.promise().query(
                'SELECT * FROM institutions WHERE id = ? AND user_id = ?',
                [id, userId]
            );
            
            if (institution.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Institución no encontrada o no tienes permisos'
                });
            }
            
            // Construir query de actualización
            const fields = [];
            const values = [];
            
            // Añadir todos los campos que puedan actualizarse
            const fieldMappings = {
                nombre: 'nombre',
                claveCCT: 'clave_cct',
                telefono: 'telefono',
                extension: 'extension',
                correo: 'correo',
                nombreRepresentante: 'nombre_representante',
                puestoRepresentante: 'puesto_representante',
                direccion: 'direccion',
                logo: 'logo',
                estado: 'estado'
            };
            
            for (const [frontendField, backendField] of Object.entries(fieldMappings)) {
                if (updateData[frontendField] !== undefined) {
                    fields.push(`${backendField} = ?`);
                    values.push(updateData[frontendField]);
                }
            }
            
            if (fields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No hay datos para actualizar'
                });
            }
            
            values.push(id, userId);
            
            const query = `UPDATE institutions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ?`;
            
            await db.promise().query(query, values);
            
            // Manejar actualización de carreras si se proporcionan
            if (updateData.carreras !== undefined) {
                console.log('🔄 Actualizando carreras asociadas:', updateData.carreras);
                
                // Eliminar relaciones existentes
                await db.promise().query(
                    'DELETE FROM institution_careers WHERE institution_id = ?',
                    [id]
                );
                
                // Agregar nuevas relaciones
                if (updateData.carreras && updateData.carreras.length > 0) {
                    const placeholders = updateData.carreras.map(() => '(?, ?)').join(', ');
                    const insertValues = updateData.carreras.flatMap(careerId => [id, careerId]);
                    
                    await db.promise().query(
                        `INSERT INTO institution_careers (institution_id, career_id) VALUES ${placeholders}`,
                        insertValues
                    );
                }
            }
            
            console.log('✅ Institución actualizada exitosamente');
            
            res.json({
                success: true,
                message: 'Institución actualizada exitosamente'
            });
            
        } catch (error) {
            console.error('❌ Error actualizando institución:', error);
            res.status(500).json({
                success: false,
                message: 'Error actualizando institución: ' + error.message
            });
        }
    }

    // ✅ ELIMINAR INSTITUCIÓN
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            
            console.log(`🗑️ Eliminando institución ${id} para usuario ${userId}`);
            
            // Verificar que la institución existe y pertenece al usuario
            const [institution] = await db.promise().query(
                'SELECT id FROM institutions WHERE id = ? AND user_id = ?',
                [id, userId]
            );
            
            if (institution.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Institución no encontrada o no tienes permisos'
                });
            }
            
            // Eliminar relaciones con carreras primero
            await db.promise().query(
                'DELETE FROM institution_careers WHERE institution_id = ?',
                [id]
            );
            
            // Eliminar institución
            await db.promise().query(
                'DELETE FROM institutions WHERE id = ?',
                [id]
            );
            
            console.log('✅ Institución eliminada exitosamente');
            
            res.json({
                success: true,
                message: 'Institución eliminada exitosamente'
            });
            
        } catch (error) {
            console.error('❌ Error eliminando institución:', error);
            res.status(500).json({
                success: false,
                message: 'Error eliminando institución: ' + error.message
            });
        }
    }

    // ✅ OBTENER TODAS LAS INSTITUCIONES (solo admin)
    static async getAll(req, res) {
        try {
            const [institutions] = await db.promise().query(`
                SELECT i.*, u.username as propietario
                FROM institutions i
                LEFT JOIN users u ON i.user_id = u.id
                ORDER BY i.created_at DESC
            `);
            
            res.json({
                success: true,
                data: institutions,
                count: institutions.length
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo todas las instituciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo instituciones: ' + error.message
            });
        }
    }

    // ✅ MÉTODOS ADICIONALES PARA EL DASHBOARD

    // Obtener estadísticas del sistema
    static async getStatistics(req, res) {
        try {
            const [userStats] = await db.promise().query(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
                    SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as normal_users
                FROM users
            `);
            
            const [institutionStats] = await db.promise().query(`
                SELECT 
                    COUNT(*) as total_institutions,
                    SUM(CASE WHEN estado = 'active' THEN 1 ELSE 0 END) as active_institutions
                FROM institutions
            `);
            
            const [careerStats] = await db.promise().query(`
                SELECT 
                    COUNT(*) as total_careers,
                    SUM(CASE WHEN activa = 1 THEN 1 ELSE 0 END) as active_careers,
                    SUM(poblacion_esperada) as total_poblacion_esperada,
                    SUM(poblacion_real) as total_poblacion_real
                FROM careers
            `);
            
            res.json({
                success: true,
                statistics: {
                    users: userStats[0],
                    institutions: institutionStats[0],
                    careers: careerStats[0]
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

    // Obtener tecnológicos pre-registrados
    static async getPreRegisteredInstitutions(req, res) {
        try {
            // Aquí puedes cargar datos de ejemplo o de un archivo JSON
            const preRegisteredTecs = [
                {
                    nombre: 'Tecnológico Nacional de México - Campus Centro',
                    claveCCT: 'CCT001',
                    telefono: '555-1000',
                    correo: 'contacto@tecnm.mx',
                    nombreRepresentante: 'Dr. Juan Pérez',
                    puestoRepresentante: 'Director General',
                    direccion: 'Av. Universidad 1000, Ciudad de México',
                    carreras: ['Ingeniería en Sistemas Computacionales', 'Ingeniería Industrial']
                },
                {
                    nombre: 'Tecnológico de Estudios Superiores del Oriente',
                    claveCCT: 'CCT002',
                    telefono: '555-2000',
                    correo: 'info@teso.edu.mx',
                    nombreRepresentante: 'Ing. María García',
                    puestoRepresentante: 'Directora',
                    direccion: 'Carretera Federal, Estado de México',
                    carreras: ['Licenciatura en Administración', 'Ingeniería en Mecatrónica']
                },
                {
                    nombre: 'Tecnológico de Monterrey - Campus Ciudad de México',
                    claveCCT: 'CCT003',
                    telefono: '555-3000',
                    correo: 'admisiones@tec.mx',
                    nombreRepresentante: 'Lic. Roberto Sánchez',
                    puestoRepresentante: 'Director de Admisiones',
                    direccion: 'Calzada del Valle 400, San Pedro Garza García',
                    carreras: ['Ingeniería en Sistemas Digitales', 'Ingeniería en Biotecnología']
                }
            ];
            
            res.json({
                success: true,
                tecs: preRegisteredTecs,
                count: preRegisteredTecs.length
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo tecnológicos pre-registrados:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo tecnológicos pre-registrados: ' + error.message
            });
        }
    }

    // Cargar tecnológicos pre-registrados para el usuario actual
    static async loadPreRegisteredInstitutions(req, res) {
        try {
            const userId = req.user.userId;
            
            console.log('⚡ Cargando tecnológicos pre-registrados para usuario:', userId);
            
            // Verificar si el usuario ya tiene instituciones
            const [existingInstitutions] = await db.promise().query(
                'SELECT COUNT(*) as count FROM institutions WHERE user_id = ?',
                [userId]
            );
            
            if (existingInstitutions[0].count > 0 && req.user.role !== 'admin') {
                return res.status(400).json({
                    success: false,
                    message: 'Ya tienes instituciones registradas. Los usuarios normales solo pueden tener una institución.'
                });
            }
            
            // Datos de ejemplo de tecnológicos pre-registrados
            const preRegisteredTecs = [
                {
                    nombre: 'Tecnológico Nacional de México - Campus Centro',
                    claveCCT: 'CCT' + Date.now(), // Generar CCT único
                    telefono: '555-1000',
                    correo: 'contacto@tecnm.mx',
                    nombreRepresentante: 'Dr. Juan Pérez',
                    puestoRepresentante: 'Director General',
                    direccion: 'Av. Universidad 1000, Ciudad de México',
                    estado: 'active',
                    carreras: [1, 2] // IDs de carreras existentes
                }
            ];
            
            let addedCount = 0;
            
            // Insertar cada tecnológico
            for (const tec of preRegisteredTecs) {
                try {
                    // Insertar institución
                    const [result] = await db.promise().query(
                        `INSERT INTO institutions 
                        (user_id, nombre, clave_cct, telefono, correo, 
                         nombre_representante, puesto_representante, direccion, estado) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            userId, tec.nombre, tec.claveCCT, tec.telefono, tec.correo,
                            tec.nombreRepresentante, tec.puestoRepresentante, tec.direccion, tec.estado
                        ]
                    );
                    
                    const institutionId = result.insertId;
                    
                    // Asociar carreras
                    if (tec.carreras && tec.carreras.length > 0) {
                        for (const careerId of tec.carreras) {
                            await db.promise().query(
                                'INSERT INTO institution_careers (institution_id, career_id) VALUES (?, ?)',
                                [institutionId, careerId]
                            );
                        }
                    }
                    
                    addedCount++;
                    
                } catch (error) {
                    console.error('❌ Error insertando tecnológico:', error.message);
                }
            }
            
            console.log(`✅ Cargados ${addedCount} tecnológicos pre-registrados`);
            
            res.json({
                success: true,
                message: `Se cargaron ${addedCount} tecnológicos pre-registrados exitosamente`,
                count: addedCount
            });
            
        } catch (error) {
            console.error('❌ Error cargando tecnológicos pre-registrados:', error);
            res.status(500).json({
                success: false,
                message: 'Error cargando tecnológicos pre-registrados: ' + error.message
            });
        }
    }

    // Exportar datos en diferentes formatos
    static async exportData(req, res) {
        try {
            const userId = req.user.userId;
            const format = req.query.format || 'json';
            
            console.log(`📤 Exportando datos para usuario ${userId} en formato ${format}`);
            
            // Obtener instituciones del usuario
            const [institutions] = await db.promise().query(
                'SELECT * FROM institutions WHERE user_id = ?',
                [userId]
            );
            
            // Obtener carreras asociadas a cada institución
            const institutionsWithCareers = await Promise.all(
                institutions.map(async (institution) => {
                    const [careers] = await db.promise().query(
                        `SELECT c.* FROM careers c
                         JOIN institution_careers ic ON c.id = ic.career_id
                         WHERE ic.institution_id = ?`,
                        [institution.id]
                    );
                    
                    return {
                        ...institution,
                        carreras: careers
                    };
                })
            );
            
            if (format === 'json') {
                res.json({
                    success: true,
                    data: institutionsWithCareers,
                    count: institutionsWithCareers.length,
                    exportDate: new Date().toISOString()
                });
            } else if (format === 'excel') {
                // Preparar datos para Excel
                const excelData = institutionsWithCareers.map(inst => ({
                    'ID': inst.id,
                    'Nombre': inst.nombre,
                    'Clave CCT': inst.clave_cct,
                    'Teléfono': inst.telefono,
                    'Correo': inst.correo,
                    'Representante': inst.nombre_representante,
                    'Puesto': inst.puesto_representante,
                    'Dirección': inst.direccion,
                    'Carreras': inst.carreras.map(c => c.nombre).join(', '),
                    'Estado': inst.estado,
                    'Fecha Registro': inst.created_at
                }));
                
                // En una implementación real, usarías una librería como xlsx
                // Para este ejemplo, devolvemos JSON
                res.json({
                    success: true,
                    message: 'Exportación Excel en desarrollo',
                    data: excelData
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Formato no soportado. Use "json" o "excel".'
                });
            }
            
        } catch (error) {
            console.error('❌ Error exportando datos:', error);
            res.status(500).json({
                success: false,
                message: 'Error exportando datos: ' + error.message
            });
        }
    }
}

module.exports = InstitutionController;