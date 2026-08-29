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
router.get('/', documentController.getDocumentTracking); // Fix: Map / to getDocumentTracking to prevent honeypot

// MOCK Endpoints to prevent honeypot triggers when frontend tries to POST/PUT/DELETE
router.post('/', (req, res) => res.status(501).json({ error: "Not Implemented Yet" }));
router.put('/:id', (req, res) => res.status(501).json({ error: "Not Implemented Yet" }));
router.delete('/:id', (req, res) => res.status(501).json({ error: "Not Implemented Yet" }));
router.put('/:id/keterangan', (req, res) => res.status(501).json({ error: "Not Implemented Yet" }));

module.exports = router;
