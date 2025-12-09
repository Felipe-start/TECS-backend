const express = require('express');
const router = express.Router();
const CareerController = require('../controllers/careerController');
const { authorize } = require('../middleware/auth');

// RUTAS PROTEGIDAS (requieren autenticación)
router.get('/my', authorize(), CareerController.getByUser);
router.get('/available', CareerController.getAvailable); // Pública
router.post('/', authorize(), CareerController.create);
router.get('/:id', authorize(), CareerController.getById);
router.put('/:id', authorize(), CareerController.update);
router.put('/:id/metrics', authorize(), CareerController.updateMetrics);
router.delete('/:id', authorize(), CareerController.delete);
router.get('/stats/stats', authorize(), CareerController.getStats);

// RUTAS SOLO PARA ADMIN
router.get('/', authorize(['admin']), CareerController.getAll);

module.exports = router;