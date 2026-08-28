const mongoose = require('mongoose');

const foundEvidenceSchema = new mongoose.Schema({
  missingRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MissingRequest', required: true, index: true },
  finderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  evidenceImageUrl: { type: String, default: '' },
  evidenceImagePublicId: { type: String, default: '' },
  foundLocation: { type: String, default: '', trim: true },
  foundDate: { type: Date, default: null },
  foundTime: { type: String, default: '', trim: true },
  category: { type: String, default: '', trim: true },
  brand: { type: String, default: '', trim: true },
  color: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  verificationAnswers: { type: String, default: '', trim: true },
  matchScore: { type: Number, min: 0, max: 100, required: true },
  confidence: { type: String, enum: ['HIGH', 'POSSIBLE', 'LOW'], required: true },
  matchReasons: [{ type: String }],
  privateVerificationMatched: { type: Boolean, default: false },
  status: { type: String, enum: ['PENDING_REVIEW', 'ACCEPTED', 'REJECTED'], default: 'PENDING_REVIEW' }
}, { timestamps: true });

foundEvidenceSchema.index(
  { missingRequestId: 1, finderId: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING_REVIEW' } }
);

module.exports = mongoose.model('FoundEvidence', foundEvidenceSchema);
