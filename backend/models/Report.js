const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  targetType: {
    type: String,
    enum: ['FOUND_ITEM', 'MISSING_ITEM', 'CLAIM', 'FOUND_EVIDENCE', 'MESSAGE', 'USER'],
    required: true
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: {
    type: String,
    enum: ['FAKE_OR_MISLEADING_POST', 'FALSE_CLAIM', 'FAKE_FOUND_RESPONSE', 'SPAM', 'HARASSMENT', 'SUSPICIOUS_BEHAVIOUR', 'OTHER'],
    required: true
  },
  details: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED'], default: 'OPEN' }
}, { timestamps: true });

reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1, reason: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
