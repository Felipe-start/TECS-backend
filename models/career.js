const db = require('../config/database');

const Career = {
  // Crear carrera
  create: async (careerData) => {
    const {
      userId,
      nombre,
      numeroCarrera,
      cantidadAlumnos,
      duracionSemestres,
      modalidad,
      turno,
      descripcion,
      poblacionEsperada,
      poblacionReal
    } = careerData;

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO careers 
        (nombre, numero_carrera, cantidad_alumnos, duracion_semestres,
         modalidad, turno, descripcion, user_id, poblacion_esperada, poblacion_real) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      console.log('🎓 Ejecutando query:', query);
      console.log('🎓 Datos:', [
        nombre, numeroCarrera, cantidadAlumnos, duracionSemestres,
        modalidad, turno, descripcion, userId, 
        poblacionEsperada || 0, poblacionReal || 0
      ]);
      
      db.execute(
        query,
        [
          nombre, numeroCarrera, cantidadAlumnos, duracionSemestres,
          modalidad, turno, descripcion, userId,
          poblacionEsperada || 0, poblacionReal || 0
        ],
        (err, results) => {
          if (err) {
            console.error('❌ Error en create:', err);
            reject(err);
          } else {
            console.log('✅ Resultado create:', results);
            resolve({ id: results.insertId, ...careerData });
          }
        }
      );
    });
  },

  // Obtener todas las carreras
  findAll: async () => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM careers ORDER BY created_at DESC';
      console.log('🎓 Ejecutando query:', query);
      
      db.execute(query, (err, results) => {
        if (err) {
          console.error('❌ Error en findAll:', err);
          reject(err);
        } else {
          console.log('✅ Resultado findAll:', results.length, 'carreras');
          const careers = results.map(career => ({
            id: career.id,
            userId: career.user_id,
            nombre: career.nombre,
            numeroCarrera: career.numero_carrera,
            cantidadAlumnos: career.cantidad_alumnos,
            duracionSemestres: career.duracion_semestres,
            modalidad: career.modalidad,
            turno: career.turno,
            fechaRegistro: career.fecha_registro || career.created_at,
            descripcion: career.descripcion,
            activa: career.activa,
            poblacionEsperada: career.poblacion_esperada,
            poblacionReal: career.poblacion_real,
            createdAt: career.created_at
          }));
          resolve(careers);
        }
      });
    });
  },

  // Obtener carrera por ID
  findById: async (id) => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM careers WHERE id = ?';
      console.log('🎓 Ejecutando query:', query, [id]);
      
      db.execute(query, [id], (err, results) => {
        if (err) {
          console.error('❌ Error en findById:', err);
          reject(err);
        } else {
          if (results.length === 0) {
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
            fechaRegistro: career.fecha_registro || career.created_at,
            descripcion: career.descripcion,
            activa: career.activa,
            poblacionEsperada: career.poblacion_esperada,
            poblacionReal: career.poblacion_real,
            createdAt: career.created_at
          };
          console.log('✅ Resultado findById:', mappedCareer);
          resolve(mappedCareer);
        }
      });
    });
  },

  // Obtener carreras por usuario
  findByUserId: async (userId) => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM careers WHERE user_id = ? ORDER BY created_at DESC';
      console.log('🎓 Ejecutando query:', query, [userId]);
      
      db.execute(query, [userId], (err, results) => {
        if (err) {
          console.error('❌ Error en findByUserId:', err);
          reject(err);
        } else {
          console.log('✅ Resultado findByUserId:', results.length, 'carreras');
          const careers = results.map(career => ({
            id: career.id,
            userId: career.user_id,
            nombre: career.nombre,
            numeroCarrera: career.numero_carrera,
            cantidadAlumnos: career.cantidad_alumnos,
            duracionSemestres: career.duracion_semestres,
            modalidad: career.modalidad,
            turno: career.turno,
            fechaRegistro: career.fecha_registro || career.created_at,
            descripcion: career.descripcion,
            activa: career.activa,
            poblacionEsperada: career.poblacion_esperada,
            poblacionReal: career.poblacion_real,
            createdAt: career.created_at
          }));
          resolve(careers);
        }
      });
    });
  },

  // Buscar por número de carrera
  findByNumeroCarrera: async (numeroCarrera) => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM careers WHERE numero_carrera = ?';
      console.log('🎓 Ejecutando query:', query, [numeroCarrera]);
      
      db.execute(query, [numeroCarrera], (err, results) => {
        if (err) {
          console.error('❌ Error en findByNumeroCarrera:', err);
          reject(err);
        } else {
          if (results.length === 0) {
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
            fechaRegistro: career.fecha_registro || career.created_at,
            descripcion: career.descripcion,
            activa: career.activa,
            poblacionEsperada: career.poblacion_esperada,
            poblacionReal: career.poblacion_real,
            createdAt: career.created_at
          };
          console.log('✅ Resultado findByNumeroCarrera:', mappedCareer);
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
      poblacionReal
    } = careerData;

    return new Promise((resolve, reject) => {
      const query = `
        UPDATE careers 
        SET nombre = ?, numero_carrera = ?, cantidad_alumnos = ?, 
            duracion_semestres = ?, modalidad = ?, turno = ?, 
            descripcion = ?, activa = ?, poblacion_esperada = ?, 
            poblacion_real = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      console.log('🎓 Ejecutando query:', query);
      console.log('🎓 Datos:', [
        nombre, numeroCarrera, cantidadAlumnos, duracionSemestres,
        modalidad, turno, descripcion, activa, poblacionEsperada, 
        poblacionReal, id
      ]);
      
      db.execute(
        query,
        [
          nombre, numeroCarrera, cantidadAlumnos, duracionSemestres,
          modalidad, turno, descripcion, activa, poblacionEsperada, 
          poblacionReal, id
        ],
        (err, results) => {
          if (err) {
            console.error('❌ Error en update:', err);
            reject(err);
          } else {
            console.log('✅ Resultado update:', results);
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
      console.log('🎓 Ejecutando query:', query, [id]);
      
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

  // Obtener carreras disponibles
  findAvailable: async () => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM careers WHERE activa = TRUE ORDER BY nombre';
      console.log('🎓 Ejecutando query:', query);
      
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
            fechaRegistro: career.fecha_registro || career.created_at,
            descripcion: career.descripcion,
            activa: career.activa,
            poblacionEsperada: career.poblacion_esperada,
            poblacionReal: career.poblacion_real,
            createdAt: career.created_at
          }));
          resolve(careers);
        }
      });
    });
  }
};

module.exports = Career;