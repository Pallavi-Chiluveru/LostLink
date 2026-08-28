const express = require('express');
const router = express.Router();
const missingRequestController = require('../controllers/missingRequestController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', authenticateToken, missingRequestController.getMissingRequests);
router.post('/', authenticateToken, upload.single('image'), missingRequestController.createMissingRequest);
router.get('/my', authenticateToken, missingRequestController.getMyMissingRequests);
router.get('/evidence/my', authenticateToken, missingRequestController.getMyEvidence);
router.get('/:id', authenticateToken, missingRequestController.getMissingRequestById);
router.get('/:id/matches', authenticateToken, missingRequestController.getMatchesForMissingRequest);
router.post('/:id/found-evidence', authenticateToken, upload.single('image'), missingRequestController.submitFoundEvidence);
router.get('/:id/found-evidence', authenticateToken, missingRequestController.getEvidenceForMissing);
router.post('/:id/recovered', authenticateToken, missingRequestController.markRecovered);
router.post('/:id/found-evidence/:evidenceId/accept', authenticateToken, missingRequestController.acceptEvidence);
router.post('/:id/found-evidence/:evidenceId/reject', authenticateToken, missingRequestController.rejectEvidence);
router.delete('/:id', authenticateToken, missingRequestController.deleteMissingRequest);

module.exports = router;
