const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middlewares/security');
const { authenticateToken } = require('../middlewares/auth');

// No authenticateToken here because login is public
router.post('/login', loginLimiter, authController.login);

// Logout and Check require authentication
router.post('/logout', authenticateToken, authController.logout);
router.get('/check', authenticateToken, authController.checkAuth);

module.exports = router;
