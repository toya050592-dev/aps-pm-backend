const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterDataController');
const { authorizeAdmin } = require('../middlewares/auth');

router.get('/', masterDataController.getMasterData);
router.post('/', authorizeAdmin, masterDataController.createMasterData);
router.put('/:id', authorizeAdmin, masterDataController.updateMasterData);
router.put('/:id/status', authorizeAdmin, masterDataController.updateMasterDataStatus);

module.exports = router;
