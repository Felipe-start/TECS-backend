const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de autenticación
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.put('/change-password', authController.changePassword);
router.get('/avatar/:userId', authController.getAvatar); // Nueva ruta para avatar

module.exports = router;