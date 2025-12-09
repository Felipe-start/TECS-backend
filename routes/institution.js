const express = require('express');
const router = express.Router();
const InstitutionController = require('../controllers/institutionController');
const { authorize } = require('../middleware/auth');

// RUTAS PROTEGIDAS (requieren autenticación)
router.get('/my', authorize(), InstitutionController.getByUser);
router.post('/', authorize(), InstitutionController.create);
router.get('/:id', authorize(), InstitutionController.getById);
router.put('/:id', authorize(), InstitutionController.update);
router.delete('/:id', authorize(), InstitutionController.delete);

// RUTAS PARA TECNOLÓGICOS PRE-REGISTRADOS
router.get('/pre-registered/list', authorize(), InstitutionController.getPreRegisteredInstitutions);
router.post('/pre-registered/load', authorize(), InstitutionController.loadPreRegisteredInstitutions);

// RUTAS DE EXPORTACIÓN
router.get('/export/data', authorize(), InstitutionController.exportData);

// RUTAS SOLO PARA ADMIN
router.get('/', authorize(['admin']), InstitutionController.getAll);
router.get('/statistics/stats', authorize(['admin']), InstitutionController.getStatistics);

module.exports = router;