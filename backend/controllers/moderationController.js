const mongoose = require('mongoose');
const Block = require('../models/Block');
const Report = require('../models/Report');
const User = require('../models/User');

const TARGET_TYPES = new Set(['FOUND_ITEM', 'MISSING_ITEM', 'CLAIM', 'FOUND_EVIDENCE', 'MESSAGE', 'USER']);
const REASONS = new Set(['FAKE_OR_MISLEADING_POST', 'FALSE_CLAIM', 'FAKE_FOUND_RESPONSE', 'SPAM', 'HARASSMENT', 'SUSPICIOUS_BEHAVIOUR', 'OTHER']);

exports.createReport = async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { reportedUserId, targetType, targetId, reason, details = '' } = req.body;
    if (!TARGET_TYPES.has(targetType) || !REASONS.has(reason) || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Please provide a valid report target and reason.' });
    }
    if (reportedUserId && (!mongoose.isValidObjectId(reportedUserId) || reportedUserId === reporterId)) {
      return res.status(400).json({ message: 'You cannot report yourself.' });
    }
    if (typeof details !== 'string' || details.trim().length > 1000) {
      return res.status(400).json({ message: 'Report details must be 1000 characters or fewer.' });
    }

    const report = await Report.create({
      reporterId,
      reportedUserId: reportedUserId || null,
      targetType,
      targetId,
      reason,
      details: details.trim()
    });
    res.status(201).json({ message: 'Report submitted. Our team can review it safely.', reportId: report._id });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'You already submitted this report.' });
    res.status(500).json({ message: 'Could not submit the report.' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const blockedUserId = req.params.userId;
    if (!mongoose.isValidObjectId(blockedUserId) || blockerId === blockedUserId) {
      return res.status(400).json({ message: 'You cannot block this user.' });
    }
    if (!await User.exists({ _id: blockedUserId })) return res.status(404).json({ message: 'User not found.' });
    await Block.updateOne({ blockerId, blockedUserId }, { $setOnInsert: { blockerId, blockedUserId } }, { upsert: true });
    res.json({ message: 'User blocked. Previous messages remain available.', blocked: true });
  } catch {
    res.status(500).json({ message: 'Could not block this user.' });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    await Block.deleteOne({ blockerId: req.user.userId, blockedUserId: req.params.userId });
    res.json({ message: 'User unblocked.', blocked: false });
  } catch {
    res.status(500).json({ message: 'Could not unblock this user.' });
  }
};

exports.getBlockStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherUserId = req.params.userId;
    const [blockedByMe, blockedMe] = await Promise.all([
      Block.exists({ blockerId: userId, blockedUserId: otherUserId }),
      Block.exists({ blockerId: otherUserId, blockedUserId: userId })
    ]);
    res.json({ blockedByMe: Boolean(blockedByMe), blockedMe: Boolean(blockedMe), messagingBlocked: Boolean(blockedByMe || blockedMe) });
  } catch {
    res.status(500).json({ message: 'Could not check block status.' });
  }
};
