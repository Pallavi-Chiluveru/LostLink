const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageType: {
    type: String,
    enum: ['TEXT', 'MEETING_POINT'],
    default: 'TEXT'
  },
  text: {
    type: String,
    required: function requiredText() {
      return this.messageType !== 'MEETING_POINT';
    },
    default: '',
    trim: true
  },
  meetingPoint: {
    name: { type: String, trim: true, maxlength: 120 },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    meetingDate: { type: String, trim: true },
    meetingTime: { type: String, trim: true }
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, read: 1, senderId: 1 });

module.exports = mongoose.model('Message', messageSchema);
