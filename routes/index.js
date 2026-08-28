const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middlewares/auth');

// Import Domains
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const projectRoutes = require('./projectRoutes');
const taskRoutes = require('./taskRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const onsiteRoutes = require('./onsiteRoutes');
const overtimeRoutes = require('./overtimeRoutes');
const documentRoutes = require('./documentRoutes');
const masterDataRoutes = require('./masterDataRoutes');

// Public & Auth Endpoints
router.use('/auth', authRoutes); // login inside authRoutes doesn't require token
router.use('/login', authRoutes); // For backwards compatibility with /api/login directly
router.use('/logout', authRoutes);

// Protected Endpoints - Apply authenticateToken globally for all below
router.use(authenticateToken);

router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard-stats', dashboardRoutes); // backward compatible mapped in router
router.use('/onsite-schedules', onsiteRoutes);
router.use('/overtime', overtimeRoutes);
router.use('/documents', documentRoutes);
router.use('/master-data', masterDataRoutes);

// Additional backwards compatibility if frontend calls /api/handovers directly
router.use('/handovers', documentRoutes);

module.exports = router;
