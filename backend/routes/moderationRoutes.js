const express = require('express');
const controller = require('../controllers/moderationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.post('/reports', authenticateToken, controller.createReport);
router.get('/blocks/:userId', authenticateToken, controller.getBlockStatus);
router.post('/blocks/:userId', authenticateToken, controller.blockUser);
router.delete('/blocks/:userId', authenticateToken, controller.unblockUser);

module.exports = router;
