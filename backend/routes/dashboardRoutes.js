const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticateToken, dashboardController.getStats);

module.exports = router;
