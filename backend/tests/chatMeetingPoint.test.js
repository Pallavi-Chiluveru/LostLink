const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Message = require('../models/Message');
const { normalizeMeetingPoint, isConversationClosed } = require('../controllers/chatController')._test;

test('campus meeting points accept optional date and time without coordinates', () => {
  assert.deepEqual(normalizeMeetingPoint({
    name: ' Library Entrance ',
    meetingDate: '2026-08-29',
    meetingTime: '16:30'
  }), {
    name: 'Library Entrance',
    latitude: undefined,
    longitude: undefined,
    meetingDate: '2026-08-29',
    meetingTime: '16:30'
  });
});

test('GPS meeting points normalize valid coordinates and reject unsafe input', () => {
  const point = normalizeMeetingPoint({ name: 'Shared Location', latitude: '17.385', longitude: '78.4867' });
  assert.equal(point.latitude, 17.385);
  assert.equal(point.longitude, 78.4867);
  assert.equal(normalizeMeetingPoint({ name: 'Invalid', latitude: 91, longitude: 0 }), null);
  assert.equal(normalizeMeetingPoint({ name: 'Incomplete', latitude: 17.3 }), null);
  assert.equal(normalizeMeetingPoint({ name: 'Bad date', meetingDate: 'tomorrow' }), null);
  assert.equal(normalizeMeetingPoint({ name: 'Bad time', meetingTime: '25:00' }), null);
});

test('message schema keeps old text messages valid and supports meeting-point messages', async () => {
  const ids = { conversationId: new mongoose.Types.ObjectId(), senderId: new mongoose.Types.ObjectId() };
  const textMessage = new Message({ ...ids, text: 'hey' });
  await textMessage.validate();
  assert.equal(textMessage.messageType, 'TEXT');

  const meetingMessage = new Message({
    ...ids,
    messageType: 'MEETING_POINT',
    meetingPoint: { name: 'Security Desk', meetingTime: '16:30' }
  });
  await meetingMessage.validate();
  assert.equal(meetingMessage.text, '');
});

test('meeting points are blocked after an item conversation is closed', () => {
  assert.equal(isConversationClosed({ foundItemId: { status: 'PENDING' } }), false);
  assert.equal(isConversationClosed({ foundItemId: { status: 'DELIVERED' } }), true);
  assert.equal(isConversationClosed({ missingRequestId: { status: 'RECOVERED' } }), true);
  assert.equal(isConversationClosed({ missingRequestId: { status: 'CLOSED' } }), true);
});
