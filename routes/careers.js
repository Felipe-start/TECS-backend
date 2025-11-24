const express = require('express');
const router = express.Router();
const careerController = require('../controllers/careerController');

// Verificar que el controlador se importó correctamente
console.log('✅ Importando careerController en rutas');
console.log('✅ Métodos disponibles en rutas:', Object.keys(careerController));

// Rutas para carreras
router.get('/', careerController.getCareers);
router.get('/my-careers', careerController.getMyCareers);
router.get('/available', careerController.getAvailableCareers);
router.get('/statistics', careerController.getCareerStatistics);
router.get('/:id', careerController.getCareerById);
router.post('/', careerController.createCareer);
router.put('/:id', careerController.updateCareer);
router.put('/metrics', careerController.updateCareerMetrics);
router.delete('/:id', careerController.deleteCareer);

console.log('✅ Rutas de careers configuradas correctamente');

module.exports = router;