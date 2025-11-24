const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { username, email, password } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
      db.execute(query, [username, email, hashedPassword], (err, results) => {
        if (err) reject(err);
        resolve({ 
          id: results.insertId, 
          username, 
          email,
          role: 'user',
          isActive: true,
          createdAt: new Date()
        });
      });
    });
  }

  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE email = ?';
      db.execute(query, [email], (err, results) => {
        if (err) reject(err);
        if (results[0]) {
          resolve(this.mapUserData(results[0]));
        } else {
          resolve(null);
        }
      });
    });
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE id = ?';
      db.execute(query, [id], (err, results) => {
        if (err) reject(err);
        if (results[0]) {
          resolve(this.mapUserData(results[0]));
        } else {
          resolve(null);
        }
      });
    });
  }

  static async updateProfile(userId, profileData) {
    return new Promise((resolve, reject) => {
      const { username, email, nombreCompleto, telefono, institucion, avatar } = profileData;
      
      const query = `
        UPDATE users 
        SET username = ?, email = ?, nombre_completo = ?, telefono = ?, institucion = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      db.execute(query, [username, email, nombreCompleto, telefono, institucion, avatar, userId], (err, results) => {
        if (err) reject(err);
        
        // Obtener el usuario actualizado
        this.findById(userId)
          .then(updatedUser => resolve(updatedUser))
          .catch(error => reject(error));
      });
    });
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      db.execute(query, [hashedPassword, userId], (err, results) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Mapear datos del usuario desde la base de datos
 static mapUserData(dbUser) {
  return {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    role: dbUser.role || 'user',
    nombreCompleto: dbUser.nombre_completo, // ← CORREGIDO: sin || null
    telefono: dbUser.telefono, // ← CORREGIDO: sin || null
    institucion: dbUser.institucion, // ← CORREGIDO: sin || null
    avatar: dbUser.avatar, // ← CORREGIDO: sin || null
    isActive: dbUser.is_active !== undefined ? dbUser.is_active : true,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at
  };
}
}

module.exports = User;