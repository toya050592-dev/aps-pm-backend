const express = require('express');
const router = express.Router();
const onsiteController = require('../controllers/onsiteController');

router.get('/', onsiteController.getOnsiteSchedules);
router.post('/', onsiteController.createOnsiteSchedule);
router.put('/:id', onsiteController.updateOnsiteSchedule);
router.delete('/:id', onsiteController.deleteOnsiteSchedule);

module.exports = router;
