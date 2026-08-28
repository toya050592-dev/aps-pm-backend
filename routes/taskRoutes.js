const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authorizeAdmin } = require('../middlewares/auth');
const { exportImportLimiter } = require('../middlewares/security');
const { upload } = require('../middlewares/upload');

// Task basic CRUD
router.post('/', taskController.createTask);
router.get('/:projectId', taskController.getTasksByProject);
router.put('/:id', taskController.updateTask);
router.delete('/:id', authorizeAdmin, taskController.deleteTask);

// WBS Import Endpoint
router.post('/projects/:projectId/import-wbs', exportImportLimiter, authorizeAdmin, upload.single('file'), taskController.importWbs);

// Note: Other assignments and history can be added here as needed 
// (e.g. taskController.assignTask, etc.)

module.exports = router;
