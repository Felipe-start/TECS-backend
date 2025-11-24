const Institution = require('../models/Institution');

const institutionController = {
  // Obtener todas las instituciones
  getInstitutions: async (req, res) => {
    try {
      console.log('✅ GET /api/institutions called');
      const institutions = await Institution.findAll();
      res.json({
        success: true,
        institutions: institutions // ✅ CORREGIDO: 'institutions' en lugar de 'data'
      });
    } catch (error) {
      console.error('Error getting institutions:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving institutions'
      });
    }
  },

  // Obtener institución por ID
  getInstitutionById: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`✅ GET /api/institutions/${id} called`);
      const institution = await Institution.findById(id);
      
      if (!institution) {
        return res.status(404).json({
          success: false,
          message: 'Institution not found'
        });
      }

      res.json({
        success: true,
        institution: institution // ✅ CORREGIDO: 'institution' en lugar de 'data'
      });
    } catch (error) {
      console.error('Error getting institution:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving institution'
      });
    }
  },

  // Crear nueva institución
  createInstitution: async (req, res) => {
    try {
      const institutionData = req.body;
      console.log('✅ POST /api/institutions called with:', institutionData);
      
      // Verificar si ya existe la clave CCT
      const existingInstitution = await Institution.findByClaveCCT(institutionData.claveCCT);
      if (existingInstitution) {
        return res.status(400).json({
          success: false,
          message: 'Institution with this CCT already exists'
        });
      }

      const newInstitution = await Institution.create(institutionData);
      
      res.status(201).json({
        success: true,
        message: 'Institution created successfully',
        institution: newInstitution // ✅ CORREGIDO: 'institution' en lugar de 'data'
      });
    } catch (error) {
      console.error('Error creating institution:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating institution: ' + error.message
      });
    }
  },

  // Actualizar institución
  updateInstitution: async (req, res) => {
    try {
      const { id } = req.params;
      const institutionData = req.body;

      const result = await Institution.update(id, institutionData);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Institution not found'
        });
      }

      res.json({
        success: true,
        message: 'Institution updated successfully'
      });
    } catch (error) {
      console.error('Error updating institution:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating institution'
      });
    }
  },

  // Eliminar institución
  deleteInstitution: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await Institution.delete(id);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Institution not found'
        });
      }

      res.json({
        success: true,
        message: 'Institution deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting institution:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting institution'
      });
    }
  },

  // Obtener instituciones del usuario actual - ✅ MEJORADO
  getMyInstitutions: async (req, res) => {
    try {
      console.log('✅ GET /api/institutions/my-institutions called');
      console.log('🔍 Query parameters:', req.query);
      
      // Obtener userId del query parameter
      let userId = req.query.userId;
      
      if (!userId) {
        console.log('⚠️ No se proporcionó userId en query parameters');
        return res.status(400).json({
          success: false,
          message: 'User ID es requerido como query parameter: ?userId=123'
        });
      }
      
      // Convertir a número
      userId = parseInt(userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'User ID debe ser un número válido'
        });
      }
      
      console.log('🔑 User ID usado:', userId);
      
      const institutions = await Institution.findByUserId(userId);
      
      console.log('📊 Instituciones encontradas en BD:', institutions.length);
      console.log('📋 Detalle de instituciones:', institutions);
      
      res.json({
        success: true,
        institutions: institutions, // ✅ CORREGIDO: 'institutions' en lugar de 'data'
        count: institutions.length,
        message: institutions.length > 0 
          ? `Se encontraron ${institutions.length} instituciones` 
          : 'No hay instituciones registradas para este usuario'
      });
    } catch (error) {
      console.error('❌ Error getting my institutions:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving institutions: ' + error.message
      });
    }
  },

  // Obtener instituciones pre-registradas
  getPreRegisteredInstitutions: async (req, res) => {
    try {
      console.log('✅ GET /api/institutions/pre-registered called');
      const institutions = await Institution.findAll();
      
      res.json({
        success: true,
        tecs: institutions, // ✅ CORREGIDO: 'tecs' en lugar de 'data'
        count: institutions.length
      });
    } catch (error) {
      console.error('Error getting pre-registered institutions:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving pre-registered institutions'
      });
    }
  },

  // Cargar instituciones pre-registradas
  loadPreRegisteredInstitutions: async (req, res) => {
    try {
      console.log('✅ POST /api/institutions/load-pre-registered called');
      
      // Aquí puedes agregar lógica para cargar tecnológicos pre-registrados
      // Por ahora, solo devolvemos un mensaje de éxito
      
      res.json({
        success: true,
        message: 'Tecnológicos pre-registrados cargados exitosamente'
      });
    } catch (error) {
      console.error('Error loading pre-registered institutions:', error);
      res.status(500).json({
        success: false,
        message: 'Error loading pre-registered institutions'
      });
    }
  },

  // ✅ NUEVO: Endpoint de diagnóstico
  diagnostic: async (req, res) => {
    try {
      const { userId } = req.query;
      
      console.log('🔍 DIAGNÓSTICO - UserId recibido:', userId);
      
      // Contar instituciones en BD
      const totalInstitutions = await Institution.countAll();
      const userInstitutions = await Institution.findByUserId(userId || 1);
      
      res.json({
        success: true,
        diagnostic: {
          totalInstitutionsInDB: totalInstitutions,
          userInstitutionsCount: userInstitutions.length,
          userIdReceived: userId,
          timestamp: new Date().toISOString(),
          status: 'Backend funcionando correctamente'
        }
      });
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      res.status(500).json({
        success: false,
        message: 'Error en diagnóstico: ' + error.message
      });
    }
  }
};

module.exports = institutionController;