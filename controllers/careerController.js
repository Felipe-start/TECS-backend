const Career = require('../models/Career');
const db = require('../config/database');

const careerController = {
  getCareers: async (req, res) => {
    try {
      console.log('✅ GET /api/careers called');
      const careers = await Career.findAll();
      res.json({
        success: true,
        data: careers
      });
    } catch (error) {
      console.error('Error getting careers:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving careers'
      });
    }
  },

  getCareerById: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`✅ GET /api/careers/${id} called`);
      const career = await Career.findById(id);
      
      if (!career) {
        return res.status(404).json({
          success: false,
          message: 'Career not found'
        });
      }

      res.json({
        success: true,
        data: career
      });
    } catch (error) {
      console.error('Error getting career:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving career'
      });
    }
  },

  createCareer: async (req, res) => {
    try {
      const careerData = req.body;
      console.log('✅ POST /api/careers called with:', careerData);
      const newCareer = await Career.create(careerData);
      
      res.status(201).json({
        success: true,
        message: 'Career created successfully',
        data: newCareer
      });
    } catch (error) {
      console.error('Error creating career:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating career: ' + error.message
      });
    }
  },

  updateCareer: async (req, res) => {
    try {
      const { id } = req.params;
      const careerData = req.body;

      console.log('🔍 PUT /api/careers/:id');
      console.log('📦 Body:', careerData);
      console.log('🎯 ID:', id);

      // Validar datos requeridos
      if (!careerData.nombre || !careerData.numeroCarrera) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos: nombre, numeroCarrera'
        });
      }

      const query = `
        UPDATE careers 
        SET nombre = ?, numero_carrera = ?, cantidad_alumnos = ?, 
            duracion_semestres = ?, modalidad = ?, turno = ?, 
            descripcion = ?, activa = ?, poblacion_esperada = ?, 
            poblacion_real = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      const params = [
        careerData.nombre,
        careerData.numeroCarrera,
        careerData.cantidadAlumnos || 0,
        careerData.duracionSemestres || 8,
        careerData.modalidad || 'Escolarizada',
        careerData.turno || 'Matutino',
        careerData.descripcion || '',
        careerData.activa !== undefined ? careerData.activa : true,
        careerData.poblacionEsperada || 0,
        careerData.poblacionReal || 0,
        id
      ];

      console.log('🎓 Ejecutando query:', query);
      console.log('🎓 Parámetros:', params);
      
      db.execute(query, params, (err, results) => {
        if (err) {
          console.error('❌ Error updating career:', err);
          return res.status(500).json({
            success: false,
            message: 'Error updating career: ' + err.message
          });
        }
        
        if (results.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Career not found'
          });
        }
        
        // Obtener la carrera actualizada
        const getQuery = 'SELECT * FROM careers WHERE id = ?';
        db.execute(getQuery, [id], (err, careerResults) => {
          if (err) {
            console.error('❌ Error getting updated career:', err);
            return res.status(500).json({
              success: false,
              message: 'Career updated but error retrieving data'
            });
          }
          
          const updatedCareer = careerResults[0];
          const mappedCareer = {
            id: updatedCareer.id,
            userId: updatedCareer.user_id,
            nombre: updatedCareer.nombre,
            numeroCarrera: updatedCareer.numero_carrera,
            cantidadAlumnos: updatedCareer.cantidad_alumnos,
            duracionSemestres: updatedCareer.duracion_semestres,
            modalidad: updatedCareer.modalidad,
            turno: updatedCareer.turno,
            fechaRegistro: updatedCareer.fecha_registro || updatedCareer.created_at,
            descripcion: updatedCareer.descripcion,
            activa: updatedCareer.activa,
            poblacionEsperada: updatedCareer.poblacion_esperada,
            poblacionReal: updatedCareer.poblacion_real,
            createdAt: updatedCareer.created_at
          };
          
          console.log('✅ Carrera actualizada correctamente');
          res.json({
            success: true,
            message: 'Career updated successfully',
            data: mappedCareer
          });
        });
      });
    } catch (error) {
      console.error('❌ Error in updateCareer:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating career'
      });
    }
  },

  // NUEVO MÉTODO: Actualizar solo métricas
  updateCareerMetrics: async (req, res) => {
    try {
      const { id, poblacionEsperada, poblacionReal } = req.body;
      
      console.log('🔍 PUT /api/careers/metrics');
      console.log('📦 Body:', req.body);

      // Validar que tenemos los datos necesarios
      if (!id || poblacionEsperada === undefined || poblacionReal === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos: id, poblacionEsperada, poblacionReal'
        });
      }

      const query = `
        UPDATE careers 
        SET poblacion_esperada = ?, poblacion_real = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      console.log('🎓 Ejecutando query:', query);
      console.log('🎓 Parámetros:', [poblacionEsperada, poblacionReal, id]);
      
      db.execute(query, [poblacionEsperada, poblacionReal, id], (err, results) => {
        if (err) {
          console.error('❌ Error updating career metrics:', err);
          return res.status(500).json({
            success: false,
            message: 'Error updating career metrics: ' + err.message
          });
        }
        
        if (results.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Career not found'
          });
        }
        
        console.log('✅ Métricas actualizadas correctamente');
        res.json({
          success: true,
          message: 'Career metrics updated successfully'
        });
      });
    } catch (error) {
      console.error('❌ Error in updateCareerMetrics:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating career metrics'
      });
    }
  },

  deleteCareer: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await Career.delete(id);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Career not found'
        });
      }

      res.json({
        success: true,
        message: 'Career deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting career:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting career'
      });
    }
  },

  getMyCareers: async (req, res) => {
    try {
      console.log('✅ GET /api/careers/my-careers called');
      // Temporal: usar user ID 1 hasta implementar autenticación
      const userId = 1;
      const careers = await Career.findByUserId(userId);
      
      res.json({
        success: true,
        data: careers
      });
    } catch (error) {
      console.error('Error getting my careers:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving careers'
      });
    }
  },

  getAvailableCareers: async (req, res) => {
    try {
      console.log('✅ GET /api/careers/available called');
      const careers = await Career.findAvailable();
      
      res.json({
        success: true,
        data: careers
      });
    } catch (error) {
      console.error('Error getting available careers:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving available careers'
      });
    }
  },

  // Método para obtener estadísticas de carreras
  getCareerStatistics: async (req, res) => {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_careers,
          SUM(poblacion_esperada) as total_esperada,
          SUM(poblacion_real) as total_real,
          AVG(poblacion_real / NULLIF(poblacion_esperada, 0)) as promedio_cumplimiento
        FROM careers 
        WHERE user_id = ?
      `;
      
      // Temporal: usar user ID 1
      const userId = 1;
      
      db.execute(query, [userId], (err, results) => {
        if (err) {
          console.error('Error getting career statistics:', err);
          return res.status(500).json({
            success: false,
            message: 'Error getting career statistics'
          });
        }
        
        res.json({
          success: true,
          statistics: results[0]
        });
      });
    } catch (error) {
      console.error('Error in getCareerStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Server error getting career statistics'
      });
    }
  }
};

// VERIFICA QUE SE EXPORTA CORRECTAMENTE
console.log('✅ careerController exportado correctamente');
console.log('✅ Métodos disponibles:', Object.keys(careerController));

module.exports = careerController;