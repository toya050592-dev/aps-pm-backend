const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authorizeAdmin, authenticateToken } = require('../middlewares/auth');

// Note: all routes are under app.use('/api', authenticateToken) in server.js ideally,
// but for explicit clarity, if needed, we can inject it. Assuming global auth is used.
// We explicitly use authorizeAdmin for modifying endpoints.

router.get('/', authenticateToken, userController.getAllUsers);
router.post('/', authenticateToken, authorizeAdmin, userController.createUser);
router.put('/:id', authenticateToken, authorizeAdmin, userController.updateUser);
router.put('/:id/status', authenticateToken, authorizeAdmin, userController.updateUserStatus);
router.put('/:id/password', authenticateToken, authorizeAdmin, userController.updateUserPassword);

module.exports = router;
