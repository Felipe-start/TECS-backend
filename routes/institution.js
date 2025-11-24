const express = require('express');
const router = express.Router();
const institutionController = require('../controllers/institutionController');

// Rutas para instituciones
router.get('/', institutionController.getInstitutions);
router.get('/my-institutions', institutionController.getMyInstitutions);
router.get('/pre-registered', institutionController.getPreRegisteredInstitutions);
router.get('/diagnostic', institutionController.diagnostic); // ✅ NUEVA RUTA
router.get('/:id', institutionController.getInstitutionById);
router.post('/', institutionController.createInstitution);
router.post('/load-pre-registered', institutionController.loadPreRegisteredInstitutions); // ✅ CORREGIDO: era PUT, debe ser POST
router.put('/:id', institutionController.updateInstitution);
router.delete('/:id', institutionController.deleteInstitution);

module.exports = router;