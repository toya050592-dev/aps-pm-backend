const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { heavyLimiter } = require('../middlewares/security');
const { authenticateToken } = require('../middlewares/auth');

router.get('/stats', authenticateToken, heavyLimiter, dashboardController.getDashboardStats);

// You can add /summary and /reports here too 
// router.get('/summary', authenticateToken, dashboardController.getDashboardSummary);

module.exports = router;
