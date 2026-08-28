const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authorizeAdmin } = require('../middlewares/auth');
const { exportImportLimiter } = require('../middlewares/security');
const { upload } = require('../middlewares/upload');

// Create new project (Admin Only - Fixed Missing Authorization)
router.post('/', authorizeAdmin, projectController.createProject);

// Import projects from Excel
router.post('/import', exportImportLimiter, authorizeAdmin, upload.single('file'), projectController.importProjects);

module.exports = router;
