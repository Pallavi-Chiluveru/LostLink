const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  foundItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoundItem',
    default: null
  },
  claimRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClaimRequest',
    default: null
  },
  finderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  claimantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  missingRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MissingRequest', default: null },
  foundEvidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundEvidence', default: null }
}, {
  timestamps: true
});

conversationSchema.index({ finderId: 1, updatedAt: -1 });
conversationSchema.index({ claimantId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
