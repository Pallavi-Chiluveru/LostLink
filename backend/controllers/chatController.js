const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Block = require('../models/Block');
const mongoose = require('mongoose');

const MESSAGE_TYPES = new Set(['TEXT', 'MEETING_POINT']);

function cleanOptionalString(value, maxLength) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean && clean.length <= maxLength ? clean : null;
}

function normalizeMeetingPoint(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const name = cleanOptionalString(input.name, 120);
  const meetingDate = cleanOptionalString(input.meetingDate, 10);
  const meetingTime = cleanOptionalString(input.meetingTime, 5);
  const hasLatitude = input.latitude !== undefined && input.latitude !== null && input.latitude !== '';
  const hasLongitude = input.longitude !== undefined && input.longitude !== null && input.longitude !== '';

  if (!name || meetingDate === null || meetingTime === null) return null;
  if (meetingDate && !/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) return null;
  if (meetingTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(meetingTime)) return null;
  if (hasLatitude !== hasLongitude) return null;

  const latitude = hasLatitude ? Number(input.latitude) : undefined;
  const longitude = hasLongitude ? Number(input.longitude) : undefined;
  if (hasLatitude && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) return null;

  return { name, latitude, longitude, meetingDate, meetingTime };
}

function isConversationClosed(conversation) {
  return conversation?.foundItemId?.status === 'DELIVERED' ||
    ['RECOVERED', 'CLOSED'].includes(conversation?.missingRequestId?.status);
}

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      $or: [{ finderId: userId }, { claimantId: userId }]
    })
      .populate('foundItemId', 'itemName imageUrl category status postedBy')
      .populate('missingRequestId', 'itemName imageUrl category status userId')
      .populate('finderId', 'name batchYear departmentCode')
      .populate('claimantId', 'name batchYear departmentCode')
      .sort({ updatedAt: -1 });

    const conversationIds = conversations.map((conversation) => conversation._id);
    const [lastMessageRows, unreadRows] = conversationIds.length ? await Promise.all([
      Message.aggregate([
        { $match: { conversationId: { $in: conversationIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$conversationId', message: { $first: '$$ROOT' } } }
      ]),
      Message.aggregate([
        { $match: { conversationId: { $in: conversationIds }, senderId: { $ne: new mongoose.Types.ObjectId(userId) }, read: false } },
        { $group: { _id: '$conversationId', count: { $sum: 1 } } }
      ])
    ]) : [[], []];
    const lastMessages = new Map(lastMessageRows.map((row) => [row._id.toString(), row.message]));
    const unreadCounts = new Map(unreadRows.map((row) => [row._id.toString(), row.count]));
    const formatted = [];

    for (const conv of conversations) {
      // Guard against deleted/null user or item records
      if (!conv.finderId || !conv.claimantId) {
        continue;
      }

      const conversationId = conv._id.toString();
      const lastMsg = lastMessages.get(conversationId);
      const unreadCount = unreadCounts.get(conversationId) || 0;

      const finderIdStr = conv.finderId._id ? conv.finderId._id.toString() : conv.finderId.toString();
      const otherUser = finderIdStr === userId ? conv.claimantId : conv.finderId;

      formatted.push({
        _id: conv._id,
        foundItem: conv.foundItemId || null,
        missingRequest: conv.missingRequestId || null,
        item: conv.foundItemId || conv.missingRequestId || { itemName: 'Item', imageUrl: '' },
        otherUser: {
          _id: otherUser ? (otherUser._id || otherUser) : null,
          name: (otherUser && otherUser.name) ? otherUser.name.split(' ')[0] : 'Student',
          dept: otherUser ? `${otherUser.departmentCode || ''} (Batch ${otherUser.batchYear || ''})` : 'Anurag Student'
        },
        lastMessage: lastMsg
          ? (lastMsg.messageType === 'MEETING_POINT' ? `Meeting point: ${lastMsg.meetingPoint?.name || 'Shared Location'}` : lastMsg.text)
          : 'Conversation started',
        lastMessageTime: lastMsg ? lastMsg.createdAt : conv.createdAt,
        unreadCount
      });
    }

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ message: 'Server error fetching conversations.' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const conversation = await Conversation.findById(conversationId)
      .populate('foundItemId')
      .populate('missingRequestId')
      .populate('finderId', 'name batchYear departmentCode')
      .populate('claimantId', 'name batchYear departmentCode');

    if (!conversation || !conversation.finderId || !conversation.claimantId) {
      return res.status(404).json({ message: 'Conversation or user records not found.' });
    }

    const finderIdStr = conversation.finderId._id ? conversation.finderId._id.toString() : conversation.finderId.toString();
    const claimantIdStr = conversation.claimantId._id ? conversation.claimantId._id.toString() : conversation.claimantId.toString();

    const isFinder = finderIdStr === userId;
    const isClaimant = claimantIdStr === userId;

    if (!isFinder && !isClaimant) {
      return res.status(403).json({ message: 'Forbidden: You are not a participant in this private conversation.' });
    }

    // Mark unread messages as read
    await Message.updateMany(
      { conversationId, senderId: { $ne: userId }, read: false },
      { read: true }
    );

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
    const otherUser = isFinder ? conversation.claimantId : conversation.finderId;
    const [blockedByMe, blockedMe] = await Promise.all([
      Block.exists({ blockerId: userId, blockedUserId: otherUser._id }),
      Block.exists({ blockerId: otherUser._id, blockedUserId: userId })
    ]);

    res.json({
      conversationId: conversation._id,
      foundItem: conversation.foundItemId || null,
      missingRequest: conversation.missingRequestId || null,
      item: conversation.foundItemId || conversation.missingRequestId || { itemName: 'Item', imageUrl: '' },
      otherUser: {
        _id: otherUser ? (otherUser._id || otherUser) : null,
        name: (otherUser && otherUser.name) ? otherUser.name.split(' ')[0] : 'Student',
        dept: otherUser ? `${otherUser.departmentCode || ''} (Batch ${otherUser.batchYear || ''})` : 'Anurag Student'
      },
      blockStatus: { blockedByMe: Boolean(blockedByMe), blockedMe: Boolean(blockedMe), messagingBlocked: Boolean(blockedByMe || blockedMe) },
      messages
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Server error fetching message history.' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text = '', meetingPoint } = req.body;
    const messageType = req.body.messageType || 'TEXT';
    const userId = req.user.userId;

    if (!MESSAGE_TYPES.has(messageType)) {
      return res.status(400).json({ message: 'Invalid message type.' });
    }

    if (messageType === 'TEXT' && (typeof text !== 'string' || !text.trim())) {
      return res.status(400).json({ message: 'Message text cannot be empty.' });
    }

    const normalizedMeetingPoint = messageType === 'MEETING_POINT'
      ? normalizeMeetingPoint(meetingPoint)
      : undefined;
    if (messageType === 'MEETING_POINT' && !normalizedMeetingPoint) {
      return res.status(400).json({ message: 'Please provide a valid meeting point.' });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('foundItemId', 'status')
      .populate('missingRequestId', 'status');
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const finderIdStr = conversation.finderId.toString();
    const claimantIdStr = conversation.claimantId.toString();

    const isFinder = finderIdStr === userId;
    const isClaimant = claimantIdStr === userId;

    if (!isFinder && !isClaimant) {
      return res.status(403).json({ message: 'Forbidden: You cannot send messages in this conversation.' });
    }

    const otherUserId = isFinder
      ? (conversation.claimantId._id || conversation.claimantId)
      : (conversation.finderId._id || conversation.finderId);
    const communicationBlocked = await Block.exists({
      $or: [
        { blockerId: userId, blockedUserId: otherUserId },
        { blockerId: otherUserId, blockedUserId: userId }
      ]
    });
    if (communicationBlocked) {
      return res.status(403).json({ message: 'Messaging is unavailable because one participant blocked the other.' });
    }

    if (messageType === 'MEETING_POINT' && isConversationClosed(conversation)) {
      return res.status(409).json({ message: 'This conversation is closed, so a new meeting point cannot be shared.' });
    }

    const message = new Message({
      conversationId,
      senderId: userId,
      messageType,
      text: messageType === 'TEXT' ? text.trim() : '',
      meetingPoint: normalizedMeetingPoint,
      read: false
    });

    await message.save();

    // Update conversation timestamp
    conversation.updatedAt = new Date();
    await conversation.save();

    // Send notification to recipient
    const recipientId = isFinder ? conversation.claimantId : conversation.finderId;
    const sender = await User.findById(userId);
    const senderName = sender ? sender.name.split(' ')[0] : 'Student';

    await Notification.create({
      userId: recipientId,
      type: messageType === 'MEETING_POINT' ? 'MEETING_POINT_SUGGESTED' : 'NEW_MESSAGE',
      message: messageType === 'MEETING_POINT'
        ? 'New meeting point from ' + senderName + ': ' + normalizedMeetingPoint.name
        : `💬 New message from ${senderName}: "${text.trim().substring(0, 40)}..."`,
      relatedItemId: conversation.foundItemId?._id || conversation.missingRequestId?._id
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Server error sending message.' });
  }
};

exports._test = { normalizeMeetingPoint, isConversationClosed };
