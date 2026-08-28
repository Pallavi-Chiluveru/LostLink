const mongoose = require('mongoose');

const missingRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  imagePublicId: {
    type: String,
    default: ''
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  brand: {
    type: String,
    default: '',
    trim: true
  },
  color: {
    type: String,
    required: [true, 'Color is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  lastKnownLocation: {
    type: String,
    required: [true, 'Last known location is required'],
    trim: true
  },
  approximateLostDate: {
    type: Date,
    default: Date.now
  },
  approximateLostTime: { type: String, default: '', trim: true },
  privateVerificationDetails: { type: String, default: '', trim: true, select: false },
  additionalPrivateDetails: {
    type: String,
    default: '',
    trim: true,
    select: false
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'MATCHED', 'RECOVERED', 'CLOSED'],
    default: 'ACTIVE'
  },
  matchedFoundItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', default: null },
  acceptedEvidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundEvidence', default: null },
  recoveredAt: { type: Date, default: null }
}, {
  timestamps: true
});

missingRequestSchema.index({ status: 1, createdAt: -1 });
missingRequestSchema.index({ userId: 1, createdAt: -1 });

missingRequestSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.privateVerificationDetails;
  delete obj.additionalPrivateDetails;
  return obj;
};

module.exports = mongoose.model('MissingRequest', missingRequestSchema);
