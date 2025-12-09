const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authorize } = require('../middleware/auth');

// ============================================
// RUTAS PÚBLICAS (NO requieren token)
// ============================================
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// ============================================
// RUTAS PROTEGIDAS (requieren token)
// ============================================
router.get('/profile', authorize(), AuthController.getProfile);
router.get('/verify', authorize(), AuthController.verify);
router.put('/profile', authorize(), AuthController.updateProfile); // ✅ AGREGADA
router.put('/avatar', authorize(), AuthController.updateAvatar);   // ✅ AGREGADA
router.put('/change-password', authorize(), AuthController.changePassword); // ✅ AGREGADA
router.put('/update-full-profile', authorize(), AuthController.updateFullProfile); // ✅ AGREGADA

// ============================================
// RUTAS SOLO PARA ADMIN (requieren token Y rol admin)
// ============================================
router.get('/users', authorize(['admin']), AuthController.getAllUsers);

module.exports = router;