const express = require('express');
const router = express.Router();
const overtimeController = require('../controllers/overtimeController');
const { uploadDisk } = require('../middlewares/upload');

// Assuming uploadDisk is properly exported from middlewares/upload, otherwise we can use standard upload
router.get('/', overtimeController.getOvertime);
router.post('/', uploadDisk.single('evidence'), overtimeController.createOvertime);
router.put('/:id/approve', overtimeController.approveOvertime);
router.delete('/:id', overtimeController.deleteOvertime);

module.exports = router;
