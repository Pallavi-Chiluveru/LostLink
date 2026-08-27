const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

router.post('/suggest-questions', authenticateToken, aiController.suggestQuestions);

module.exports = router;
