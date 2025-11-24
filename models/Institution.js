const db = require('../config/database');

const Institution = {
  // Crear institución - CORREGIDO para usar nombres de columnas correctos
  create: async (institutionData) => {
    const {
      userId,
      nombre,
      claveCCT,
      telefono,
      extension,
      correo,
      nombreRepresentante,
      puestoRepresentante,
      direccion,
      carreras, // Array de IDs de carreras
      logo
    } = institutionData;

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO institutions 
        (user_id, nombre, clave_cct, telefono, extension, correo, 
         nombre_representante, puesto_representante, direccion, logo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      console.log('📝 Ejecutando query CREATE:', query);
      console.log('📝 Datos:', [
        userId, nombre, claveCCT, telefono, extension, correo, 
        nombreRepresentante, puestoRepresentante, direccion, logo
      ]);
      
      db.execute(
        query,
        [
          userId, nombre, claveCCT, telefono, extension, correo, 
          nombreRepresentante, puestoRepresentante, direccion, logo
        ],
        (err, results) => {
          if (err) {
            console.error('❌ Error en create:', err);
            reject(err);
          } else {
            console.log('✅ Institución creada con ID:', results.insertId);
            
            // Si hay carreras, crear las relaciones
            if (carreras && carreras.length > 0) {
              Institution.addCareersToInstitution(results.insertId, carreras)
                .then(() => {
                  // Obtener la institución completa con sus carreras
                  Institution.findById(results.insertId)
                    .then(newInstitution => {
                      resolve(newInstitution);
                    })
                    .catch(error => {
                      resolve({ id: results.insertId, ...institutionData });
                    });
                })
                .catch(error => {
                  console.error('❌ Error agregando carreras:', error);
                  resolve({ id: results.insertId, ...institutionData });
                });
            } else {
              // Obtener la institución sin carreras
              Institution.findById(results.insertId)
                .then(newInstitution => {
                  resolve(newInstitution);
                })
                .catch(error => {
                  resolve({ id: results.insertId, ...institutionData });
                });
            }
          }
        }
      );
    });
  },

  // Agregar carreras a una institución
  addCareersToInstitution: async (institutionId, careerNames) => {
    return new Promise((resolve, reject) => {
      // Primero necesitamos obtener los IDs de las carreras por sus nombres
      const placeholders = careerNames.map(() => '?').join(',');
      const query = `SELECT id FROM careers WHERE nombre IN (${placeholders})`;
      
      db.execute(query, careerNames, (err, results) => {
        if (err) {
          console.error('❌ Error buscando carreras:', err);
          reject(err);
          return;
        }
        
        if (results.length === 0) {
          console.log('⚠️ No se encontraron carreras con esos nombres');
          resolve();
          return;
        }
        
        const careerIds = results.map(row => row.id);
        
        // Insertar relaciones en institution_careers
        const relationQueries = careerIds.map(careerId => {
          return new Promise((resolveRelation, rejectRelation) => {
            const relationQuery = `
              INSERT IGNORE INTO institution_careers (institution_id, career_id) 
              VALUES (?, ?)
            `;
            
            db.execute(relationQuery, [institutionId, careerId], (err, results) => {
              if (err) {
                console.error('❌ Error creando relación:', err);
                rejectRelation(err);
              } else {
                resolveRelation();
              }
            });
          });
        });
        
        Promise.all(relationQueries)
          .then(() => {
            console.log(`✅ ${careerIds.length} carreras agregadas a institución ${institutionId}`);
            resolve();
          })
          .catch(error => {
            reject(error);
          });
      });
    });
  },

  // Obtener todas las instituciones con sus carreras
  findAll: async () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT i.*, GROUP_CONCAT(c.nombre) as carreras_nombres
        FROM institutions i
        LEFT JOIN institution_careers ic ON i.id = ic.institution_id
        LEFT JOIN careers c ON ic.career_id = c.id
        GROUP BY i.id
        ORDER BY i.created_at DESC
      `;
      
      console.log('📝 Ejecutando query FIND ALL:', query);
      
      db.execute(query, (err, results) => {
        if (err) {
          console.error('❌ Error en findAll:', err);
          reject(err);
        } else {
          console.log('✅ Resultado findAll:', results.length, 'instituciones');
          
          // Formatear resultados para el frontend
          const institutions = results.map(institution => ({
            id: institution.id,
            userId: institution.user_id,
            nombre: institution.nombre,
            claveCCT: institution.clave_cct,
            telefono: institution.telefono,
            extension: institution.extension,
            correo: institution.correo,
            nombreRepresentante: institution.nombre_representante,
            puestoRepresentante: institution.puesto_representante,
            direccion: institution.direccion,
            logo: institution.logo,
            carreras: institution.carreras_nombres ? institution.carreras_nombres.split(',') : [],
            createdAt: institution.created_at
          }));
          
          resolve(institutions);
        }
      });
    });
  },

  // Obtener institución por ID con sus carreras
  findById: async (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT i.*, GROUP_CONCAT(c.nombre) as carreras_nombres
        FROM institutions i
        LEFT JOIN institution_careers ic ON i.id = ic.institution_id
        LEFT JOIN careers c ON ic.career_id = c.id
        WHERE i.id = ?
        GROUP BY i.id
      `;
      
      console.log('📝 Ejecutando query FIND BY ID:', query, [id]);
      
      db.execute(query, [id], (err, results) => {
        if (err) {
          console.error('❌ Error en findById:', err);
          reject(err);
        } else {
          if (results.length === 0) {
            console.log('❌ Institución no encontrada con ID:', id);
            resolve(null);
            return;
          }
          
          const institution = results[0];
          const formattedInstitution = {
            id: institution.id,
            userId: institution.user_id,
            nombre: institution.nombre,
            claveCCT: institution.clave_cct,
            telefono: institution.telefono,
            extension: institution.extension,
            correo: institution.correo,
            nombreRepresentante: institution.nombre_representante,
            puestoRepresentante: institution.puesto_representante,
            direccion: institution.direccion,
            logo: institution.logo,
            carreras: institution.carreras_nombres ? institution.carreras_nombres.split(',') : [],
            createdAt: institution.created_at
          };
          
          console.log('✅ Resultado findById:', formattedInstitution);
          resolve(formattedInstitution);
        }
      });
    });
  },

  // Obtener instituciones por usuario con sus carreras
  findByUserId: async (userId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT i.*, GROUP_CONCAT(c.nombre) as carreras_nombres
        FROM institutions i
        LEFT JOIN institution_careers ic ON i.id = ic.institution_id
        LEFT JOIN careers c ON ic.career_id = c.id
        WHERE i.user_id = ?
        GROUP BY i.id
        ORDER BY i.created_at DESC
      `;
      
      console.log('📝 Ejecutando query FIND BY USER ID:', query, [userId]);
      
      db.execute(query, [userId], (err, results) => {
        if (err) {
          console.error('❌ Error en findByUserId:', err);
          reject(err);
        } else {
          console.log('✅ Resultado findByUserId:', results.length, 'instituciones para usuario', userId);
          
          // Formatear resultados para el frontend
          const institutions = results.map(institution => ({
            id: institution.id,
            userId: institution.user_id,
            nombre: institution.nombre,
            claveCCT: institution.clave_cct,
            telefono: institution.telefono,
            extension: institution.extension,
            correo: institution.correo,
            nombreRepresentante: institution.nombre_representante,
            puestoRepresentante: institution.puesto_representante,
            direccion: institution.direccion,
            logo: institution.logo,
            carreras: institution.carreras_nombres ? institution.carreras_nombres.split(',') : [],
            createdAt: institution.created_at
          }));
          
          resolve(institutions);
        }
      });
    });
  },

  // Buscar por clave CCT con carreras
  findByClaveCCT: async (claveCCT) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT i.*, GROUP_CONCAT(c.nombre) as carreras_nombres
        FROM institutions i
        LEFT JOIN institution_careers ic ON i.id = ic.institution_id
        LEFT JOIN careers c ON ic.career_id = c.id
        WHERE i.clave_cct = ?
        GROUP BY i.id
      `;
      
      console.log('📝 Ejecutando query FIND BY CCT:', query, [claveCCT]);
      
      db.execute(query, [claveCCT], (err, results) => {
        if (err) {
          console.error('❌ Error en findByClaveCCT:', err);
          reject(err);
        } else {
          if (results.length === 0) {
            console.log('✅ No se encontró institución con CCT:', claveCCT);
            resolve(null);
            return;
          }
          
          const institution = results[0];
          const formattedInstitution = {
            id: institution.id,
            userId: institution.user_id,
            nombre: institution.nombre,
            claveCCT: institution.clave_cct,
            telefono: institution.telefono,
            extension: institution.extension,
            correo: institution.correo,
            nombreRepresentante: institution.nombre_representante,
            puestoRepresentante: institution.puesto_representante,
            direccion: institution.direccion,
            logo: institution.logo,
            carreras: institution.carreras_nombres ? institution.carreras_nombres.split(',') : [],
            createdAt: institution.created_at
          };
          
          console.log('✅ Resultado findByClaveCCT:', formattedInstitution);
          resolve(formattedInstitution);
        }
      });
    });
  },

  // Actualizar institución y sus carreras
  update: async (id, institutionData) => {
    const {
      nombre,
      claveCCT,
      telefono,
      extension,
      correo,
      nombreRepresentante,
      puestoRepresentante,
      direccion,
      carreras,
      logo
    } = institutionData;

    return new Promise((resolve, reject) => {
      const query = `
        UPDATE institutions 
        SET nombre = ?, clave_cct = ?, telefono = ?, extension = ?, correo = ?,
            nombre_representante = ?, puesto_representante = ?, 
            direccion = ?, logo = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      console.log('📝 Ejecutando query UPDATE:', query);
      console.log('📝 Datos:', [
        nombre, claveCCT, telefono, extension, correo, 
        nombreRepresentante, puestoRepresentante, direccion, logo, id
      ]);
      
      db.execute(
        query,
        [
          nombre, claveCCT, telefono, extension, correo, 
          nombreRepresentante, puestoRepresentante, direccion, logo, id
        ],
        (err, results) => {
          if (err) {
            console.error('❌ Error en update:', err);
            reject(err);
          } else {
            console.log('✅ Institución actualizada, resultados:', results);
            
            // Actualizar relaciones de carreras si se proporcionaron
            if (carreras) {
              // Primero eliminar todas las relaciones existentes
              const deleteQuery = 'DELETE FROM institution_careers WHERE institution_id = ?';
              db.execute(deleteQuery, [id], (err) => {
                if (err) {
                  console.error('❌ Error eliminando relaciones de carreras:', err);
                  // Continuar de todos modos
                }
                
                // Luego agregar las nuevas carreras
                if (carreras.length > 0) {
                  Institution.addCareersToInstitution(id, carreras)
                    .then(() => {
                      Institution.findById(id)
                        .then(updatedInstitution => {
                          resolve(updatedInstitution);
                        })
                        .catch(error => {
                          resolve(results);
                        });
                    })
                    .catch(error => {
                      Institution.findById(id)
                        .then(updatedInstitution => {
                          resolve(updatedInstitution);
                        })
                        .catch(error => {
                          resolve(results);
                        });
                    });
                } else {
                  Institution.findById(id)
                    .then(updatedInstitution => {
                      resolve(updatedInstitution);
                    })
                    .catch(error => {
                      resolve(results);
                    });
                }
              });
            } else {
              Institution.findById(id)
                .then(updatedInstitution => {
                  resolve(updatedInstitution);
                })
                .catch(error => {
                  resolve(results);
                });
            }
          }
        }
      );
    });
  },

  // Eliminar institución (las relaciones se eliminan por CASCADE)
  delete: async (id) => {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM institutions WHERE id = ?';
      console.log('📝 Ejecutando query DELETE:', query, [id]);
      
      db.execute(query, [id], (err, results) => {
        if (err) {
          console.error('❌ Error en delete:', err);
          reject(err);
        } else {
          console.log('✅ Resultado delete:', results);
          resolve(results);
        }
      });
    });
  },

  // Contar todas las instituciones
  countAll: async () => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT COUNT(*) as count FROM institutions';
      console.log('📝 Ejecutando query COUNT ALL:', query);
      
      db.execute(query, (err, results) => {
        if (err) {
          console.error('❌ Error en countAll:', err);
          reject(err);
        } else {
          console.log('✅ Resultado countAll:', results[0].count);
          resolve(results[0].count);
        }
      });
    });
  }
};

module.exports = Institution;