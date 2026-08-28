const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// Handovers
router.get('/handovers', documentController.getHandovers);
router.post('/handovers', documentController.createHandover);
router.get('/handovers/:document_id', documentController.getHandoversByDocument);
router.put('/handovers/:id/receive', documentController.receiveHandover);

// Document Tracking
router.get('/tracking', documentController.getDocumentTracking);

module.exports = router;
