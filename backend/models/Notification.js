const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'POSSIBLE_MATCH',
      'CLAIM_REQUEST',
      'VERIFICATION_SUCCESS',
      'VERIFICATION_FAILED',
      'CLAIM_APPROVED',
      'CLAIM_REJECTED',
      'NEW_MESSAGE',
      'MEETING_POINT_SUGGESTED',
      'HANDOVER_REQUESTED',
      'HANDOVER_DECLINED',
      'REPORT_UPDATE',
      'FINDER_THANKED',
      'ITEM_DELIVERED'
      ,'FOUND_EVIDENCE_SUBMITTED','FOUND_EVIDENCE_ACCEPTED','FOUND_EVIDENCE_REJECTED','ITEM_RECOVERED'
    ],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedItemId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
