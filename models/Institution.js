const db = require('../config/database');

class Institution {
  // ✅ Obtener instituciones por usuario
  static async findByUserId(userId) {
    try {
      const [rows] = await db.promise().query(
        'SELECT * FROM institutions WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      
      // Obtener carreras para cada institución
      for (let institution of rows) {
        const [careers] = await db.promise().query(
          `SELECT c.nombre FROM careers c
           INNER JOIN institution_careers ic ON c.id = ic.career_id
           WHERE ic.institution_id = ?`,
          [institution.id]
        );
        institution.carreras = careers.map(c => c.nombre);
      }
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Obtener todas las instituciones
  static async findAll() {
    try {
      const [rows] = await db.promise().query(
        `SELECT i.*, u.nombre_completo as propietario 
         FROM institutions i
         LEFT JOIN users u ON i.user_id = u.id
         ORDER BY i.created_at DESC`
      );
      
      // Obtener carreras para cada institución
      for (let institution of rows) {
        const [careers] = await db.promise().query(
          `SELECT c.nombre FROM careers c
           INNER JOIN institution_careers ic ON c.id = ic.career_id
           WHERE ic.institution_id = ?`,
          [institution.id]
        );
        institution.carreras = careers.map(c => c.nombre);
      }
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Buscar por ID
  static async findById(id) {
    try {
      const [rows] = await db.promise().query(
        'SELECT * FROM institutions WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) return null;
      
      const institution = rows[0];
      
      // Obtener carreras
      const [careers] = await db.promise().query(
        `SELECT c.nombre FROM careers c
         INNER JOIN institution_careers ic ON c.id = ic.career_id
         WHERE ic.institution_id = ?`,
        [id]
      );
      institution.carreras = careers.map(c => c.nombre);
      
      return institution;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Verificar si CCT existe
  static async checkCCTExists(claveCCT, excludeId = null) {
    try {
      let query = 'SELECT id FROM institutions WHERE clave_cct = ?';
      const params = [claveCCT];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const [rows] = await db.promise().query(query, params);
      return rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Crear institución
  static async create(institutionData) {
    const { userId, nombre, claveCCT, telefono, extension, correo, 
            nombreRepresentante, puestoRepresentante, direccion, logo, estado } = institutionData;
    
    try {
      const [result] = await db.promise().query(
        `INSERT INTO institutions (user_id, nombre, clave_cct, telefono, extension, 
         correo, nombre_representante, puesto_representante, direccion, logo, estado, 
         created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, nombre, claveCCT, telefono || null, extension || null, 
         correo || null, nombreRepresentante || null, puestoRepresentante || null, 
         direccion || null, logo || null, estado || 'active']
      );

      return {
        id: result.insertId,
        ...institutionData
      };
    } catch (error) {
      throw error;
    }
  }

  // ✅ Actualizar institución
  static async update(id, institutionData) {
    const { nombre, claveCCT, telefono, extension, correo, 
            nombreRepresentante, puestoRepresentante, direccion, logo, estado } = institutionData;
    
    try {
      await db.promise().query(
        `UPDATE institutions 
         SET nombre = ?, clave_cct = ?, telefono = ?, extension = ?, 
             correo = ?, nombre_representante = ?, puesto_representante = ?, 
             direccion = ?, logo = ?, estado = ?, updated_at = NOW()
         WHERE id = ?`,
        [nombre, claveCCT, telefono || null, extension || null, 
         correo || null, nombreRepresentante || null, puestoRepresentante || null,
         direccion || null, logo || null, estado || 'active', id]
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Eliminar institución
  static async delete(id) {
    try {
      const [result] = await db.promise().query(
        'DELETE FROM institutions WHERE id = ?',
        [id]
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Buscar instituciones
  static async search(searchTerm) {
    try {
      const [rows] = await db.promise().query(
        `SELECT i.*, u.nombre_completo as propietario 
         FROM institutions i
         LEFT JOIN users u ON i.user_id = u.id
         WHERE i.nombre LIKE ? OR i.clave_cct LIKE ? OR i.correo LIKE ? 
            OR i.nombre_representante LIKE ? OR u.nombre_completo LIKE ?
         ORDER BY i.nombre`,
        [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, 
         `%${searchTerm}%`, `%${searchTerm}%`]
      );
      
      // Obtener carreras para cada institución
      for (let institution of rows) {
        const [careers] = await db.promise().query(
          `SELECT c.nombre FROM careers c
           INNER JOIN institution_careers ic ON c.id = ic.career_id
           WHERE ic.institution_id = ?`,
          [institution.id]
        );
        institution.carreras = careers.map(c => c.nombre);
      }
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // ✅ Obtener estadísticas
  static async getStats() {
    try {
      const [total] = await db.promise().query('SELECT COUNT(*) as total FROM institutions');
      const [active] = await db.promise().query("SELECT COUNT(*) as active FROM institutions WHERE estado = 'active'");
      const [withCareers] = await db.promise().query(
        'SELECT COUNT(DISTINCT institution_id) as with_careers FROM institution_careers'
      );
      
      return {
        totalInstitutions: total[0].total,
        activeInstitutions: active[0].active,
        inactiveInstitutions: total[0].total - active[0].active,
        institutionsWithCareers: withCareers[0].with_careers
      };
    } catch (error) {
      throw error;
    }
  }

  // ✅ Añadir relación institución-carrera
  static async addCareerRelation(institutionId, careerId) {
    try {
      await db.promise().query(
        'INSERT INTO institution_careers (institution_id, career_id) VALUES (?, ?)',
        [institutionId, careerId]
      );
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Institution;