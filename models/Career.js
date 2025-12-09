// career.model.js - ACTUALIZADO PARA TU ESTRUCTURA DE BD
const db = require('../config/database');

const Career = {
  // Crear carrera CON LOGO
  create: async (careerData) => {
    const {
      userId,
      nombre,
      numeroCarrera,
      cantidadAlumnos = 0,
      duracionSemestres = 8,
      modalidad = 'Escolarizada',
      turno = 'Matutino',
      descripcion = '',
      activa = true,
      poblacionEsperada = 0,
      poblacionReal = 0,
      logo = null
    } = careerData;

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO careers 
        (user_id, nombre, numero_carrera, cantidad_alumnos, duracion_semestres,
         modalidad, turno, fecha_registro, descripcion, activa, 
         poblacion_esperada, poblacion_real, logo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)
      `;
      
      console.log('🎓 Ejecutando query CREATE carrera:', query);
      
      db.execute(
        query,
        [
          userId, nombre, numeroCarrera, cantidadAlumnos, duracionSemestres,
          modalidad, turno, descripcion, activa ? 1 : 0, 
          poblacionEsperada, poblacionReal, logo
        ],
        (err, results) => {
          if (err) {
            console.error('❌ Error en create carrera:', err);
            reject(err);
          } else {
            console.log('✅ Carrera creada con ID:', results.insertId);
            resolve({ 
              id: results.insertId, 
              ...careerData,
              fechaRegistro: new Date().toISOString().split('T')[0],
              createdAt: new Date().toISOString()
            });
          }
        }
      );
    });
  },

  // Obtener carreras por usuario
  findByUserId: async (userId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, user_id, nombre, numero_carrera, cantidad_alumnos, 
               duracion_semestres, modalidad, turno, fecha_registro, 
               descripcion, activa, poblacion_esperada, poblacion_real, 
               logo, created_at, updated_at 
        FROM careers 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `;
      
      console.log('🎓 Ejecutando query FIND BY USER ID:', query, [userId]);
      
      db.execute(query, [userId], (err, results) => {
        if (err) {
          console.error('❌ Error en findByUserId:', err);
          reject(err);
        } else {
          console.log('✅ Resultado findByUserId:', results.length, 'carreras para usuario', userId);
          
          const careers = results.map(career => ({
            id: career.id,
            userId: career.user_id,
            nombre: career.nombre,
            numeroCarrera: career.numero_carrera,
            cantidadAlumnos: career.cantidad_alumnos,
            duracionSemestres: career.duracion_semestres,
            modalidad: career.modalidad,
            turno: career.turno,
            fechaRegistro: career.fecha_registro,
            descripcion: career.descripcion,
            activa: career.activa === 1,
            poblacionEsperada: career.poblacion_esperada,
            poblacionReal: career.poblacion_real,
            logo: career.logo,
            createdAt: career.created_at,
            updatedAt: career.updated_at
          }));
          
          resolve(careers);
        }
      });
    });
  },

  // Obtener carreras disponibles
  findAvailable: async () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, user_id, nombre, numero_carrera, cantidad_alumnos, 
               duracion_semestres, modalidad, turno, fecha_registro, 
               descripcion, activa, poblacion_esperada, poblacion_real, 
               logo, created_at, updated_at 
        FROM careers 
        WHERE activa = 1 
        ORDER BY nombre
      `;
      
      console.log('🎓 Ejecutando query FIND AVAILABLE:', query);
      
      db.execute(query, (err, results) => {
        if (err) {
          console.error('❌ Error en findAvailable:', err);
          reject(err);
        } else {
          console.log('✅ Resultado findAvailable:', results.length, 'carreras disponibles');
          
          const careers = results.map(career => ({
            id: career.id,
            userId: career.user_id,
            nombre: career.nombre,
            numeroCarrera: career.numero_carrera,
            cantidadAlumnos: career.cantidad_alumnos,
            duracionSemestres: career.duracion_semestres,
            modalidad: career.modalidad,
            turno: career.turno,
            fechaRegistro: career.fecha_registro,
            descripcion: career.descripcion,
            activa: career.activa === 1,
            poblacionEsperada: career.poblacion_esperada,
            poblacionReal: career.poblacion_real,
            logo: career.logo,
            createdAt: career.created_at,
            updatedAt: career.updated_at
          }));
          
          resolve(careers);
        }
      });
    });
  },

  // Obtener carrera por ID
  findById: async (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, user_id, nombre, numero_carrera, cantidad_alumnos, 
               duracion_semestres, modalidad, turno, fecha_registro, 
               descripcion, activa, poblacion_esperada, poblacion_real, 
               logo, created_at, updated_at 
        FROM careers 
        WHERE id = ?
      `;
      
      console.log('🎓 Ejecutando query FIND BY ID:', query, [id]);
      
      db.execute(query, [id], (err, results) => {
        if (err) {
          console.error('❌ Error en findById:', err);
          reject(err);
        } else {
          if (results.length === 0) {
            console.log('❌ Carrera no encontrada con ID:', id);
            resolve(null);
            return;
          }
          
          const career = results[0];
          const mappedCareer = {
            id: career.id,
            userId: career.user_id,
            nombre: career.nombre,
            numeroCarrera: career.numero_carrera,
            cantidadAlumnos: career.cantidad_alumnos,
            duracionSemestres: career.duracion_semestres,
            modalidad: career.modalidad,
            turno: career.turno,
            fechaRegistro: career.fecha_registro,
            descripcion: career.descripcion,
            activa: career.activa === 1,
            poblacionEsperada: career.poblacion_esperada,
            poblacionReal: career.poblacion_real,
            logo: career.logo,
            createdAt: career.created_at,
            updatedAt: career.updated_at
          };
          
          console.log('✅ Resultado findById:', mappedCareer);
          resolve(mappedCareer);
        }
      });
    });
  },

  // Actualizar carrera
  update: async (id, careerData) => {
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
    } = careerData;

    return new Promise((resolve, reject) => {
      const query = `
        UPDATE careers 
        SET nombre = ?, numero_carrera = ?, cantidad_alumnos = ?, 
            duracion_semestres = ?, modalidad = ?, turno = ?, 
            descripcion = ?, activa = ?, poblacion_esperada = ?, 
            poblacion_real = ?, logo = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      console.log('🎓 Ejecutando query UPDATE carrera:', query);
      
      db.execute(
        query,
        [
          nombre, numeroCarrera, cantidadAlumnos, duracionSemestres,
          modalidad, turno, descripcion, activa ? 1 : 0, 
          poblacionEsperada, poblacionReal, logo, id
        ],
        (err, results) => {
          if (err) {
            console.error('❌ Error en update carrera:', err);
            reject(err);
          } else {
            console.log('✅ Resultado update carrera:', results);
            resolve(results);
          }
        }
      );
    });
  },

  // Actualizar solo métricas
  updateMetrics: async (id, metricsData) => {
    const { poblacionEsperada, poblacionReal } = metricsData;
    
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE careers 
        SET poblacion_esperada = ?, poblacion_real = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      console.log('🎓 Ejecutando query UPDATE metrics:', query);
      
      db.execute(
        query,
        [poblacionEsperada, poblacionReal, id],
        (err, results) => {
          if (err) {
            console.error('❌ Error en update metrics:', err);
            reject(err);
          } else {
            console.log('✅ Resultado update metrics:', results);
            resolve(results);
          }
        }
      );
    });
  },

  // Actualizar solo logo
  updateLogo: async (id, logo) => {
    return new Promise((resolve, reject) => {
      const query = `
        UPDATE careers 
        SET logo = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      console.log('🎓 Ejecutando query UPDATE logo:', query);
      
      db.execute(
        query,
        [logo, id],
        (err, results) => {
          if (err) {
            console.error('❌ Error en update logo:', err);
            reject(err);
          } else {
            console.log('✅ Resultado update logo:', results);
            resolve(results);
          }
        }
      );
    });
  },

  // Eliminar carrera
  delete: async (id) => {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM careers WHERE id = ?';
      console.log('🎓 Ejecutando query DELETE:', query, [id]);
      
      db.execute(query, [id], (err, results) => {
        if (err) {
          console.error('❌ Error en delete:', err);
          reject(err);
        } else {
          console.log('✅ Resultado delete:', results);
          
          // Eliminar relaciones con instituciones
          const deleteRelationsQuery = 'DELETE FROM institution_careers WHERE career_id = ?';
          db.execute(deleteRelationsQuery, [id], (err2) => {
            if (err2) console.error('❌ Error eliminando relaciones:', err2);
          });
          
          resolve(results);
        }
      });
    });
  },

  // Buscar carreras por nombre
  search: async (searchTerm) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT id, user_id, nombre, numero_carrera, cantidad_alumnos, 
               duracion_semestres, modalidad, turno, fecha_registro, 
               descripcion, activa, poblacion_esperada, poblacion_real, 
               logo, created_at, updated_at 
        FROM careers 
        WHERE nombre LIKE ? AND activa = 1 
        ORDER BY nombre
      `;
      
      console.log('🎓 Ejecutando query SEARCH:', query, [`%${searchTerm}%`]);
      
      db.execute(query, [`%${searchTerm}%`], (err, results) => {
        if (err) {
          console.error('❌ Error en search:', err);
          reject(err);
        } else {
          console.log('✅ Resultado search:', results.length, 'carreras');
          
          const careers = results.map(career => ({
            id: career.id,
            userId: career.user_id,
            nombre: career.nombre,
            numeroCarrera: career.numero_carrera,
            cantidadAlumnos: career.cantidad_alumnos,
            duracionSemestres: career.duracion_semestres,
            modalidad: career.modalidad,
            turno: career.turno,
            fechaRegistro: career.fecha_registro,
            descripcion: career.descripcion,
            activa: career.activa === 1,
            poblacionEsperada: career.poblacion_esperada,
            poblacionReal: career.poblacion_real,
            logo: career.logo,
            createdAt: career.created_at,
            updatedAt: career.updated_at
          }));
          
          resolve(careers);
        }
      });
    });
  }
};

module.exports = Career;