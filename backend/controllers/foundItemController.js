const FoundItem = require('../models/FoundItem');
const MissingRequest = require('../models/MissingRequest');
const Notification = require('../models/Notification');
const Match = require('../models/Match');
const ClaimRequest = require('../models/ClaimRequest');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const ImageUploadService = require('../services/ImageUploadService');
const MatchingService = require('../services/MatchingService');

exports.createFoundItem = async (req, res) => {
  try {
    const {
      itemName,
      category,
      brand,
      color,
      description,
      locationFound,
      dateFound,
      verificationQuestions
    } = req.body;

    if (!itemName || !category || !color || !description || !locationFound) {
      return res.status(400).json({ message: 'Item name, category, color, description, and location found are required.' });
    }

    let parsedQuestions = [];
    if (typeof verificationQuestions === 'string') {
      try {
        parsedQuestions = JSON.parse(verificationQuestions);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid verification questions JSON string.' });
      }
    } else if (Array.isArray(verificationQuestions)) {
      parsedQuestions = verificationQuestions;
    }

    if (!parsedQuestions || parsedQuestions.length === 0) {
      return res.status(400).json({ message: 'At least one verification question with an expected secret answer is required.' });
    }

    // Upload image using ImageUploadService
    let imageBuffer = req.file ? req.file.buffer : null;
    const uploadResult = await ImageUploadService.uploadImage(
      imageBuffer,
      'lostlink_found_items',
      req.body.imageUrl
    );

    const foundItem = new FoundItem({
      postedBy: req.user.userId,
      imageUrl: uploadResult.imageUrl,
      imagePublicId: uploadResult.imagePublicId,
      itemName: itemName.trim(),
      category: category.trim(),
      brand: brand ? brand.trim() : '',
      color: color.trim(),
      description: description.trim(),
      locationFound: locationFound.trim(),
      dateFound: dateFound ? new Date(dateFound) : new Date(),
      status: 'PENDING',
      verificationQuestions: parsedQuestions.map(q => ({
        question: q.question.trim(),
        answer: q.answer.trim()
      }))
    });

    await foundItem.save();

    // Two-way matching: Check active missing requests against this new found item
    const activeMissing = await MissingRequest.find({ status: 'ACTIVE' });
    for (const missing of activeMissing) {
      const matchResult = MatchingService.calculateMatch(missing, foundItem);
      if (matchResult.score >= 60) {
        await Match.findOneAndUpdate({
          foundItemId: foundItem._id,
          missingRequestId: missing._id,
        }, { score: matchResult.score, confidence: matchResult.confidence, reasons: matchResult.reasons }, { upsert: true, new: true });

        // Send notification to the student who reported missing item
        await Notification.create({
          userId: missing.userId,
          type: 'POSSIBLE_MATCH',
          message: `🔍 Possible match (${matchResult.score}%) found for your missing ${missing.itemName}!`,
          relatedItemId: foundItem._id
        });
        if (foundItem.postedBy.toString() !== missing.userId.toString()) {
          await Notification.create({ userId: foundItem.postedBy, type: 'POSSIBLE_MATCH', message: `Your found ${foundItem.itemName} may match an active missing report.`, relatedItemId: missing._id });
        }
      }
    }

    res.status(201).json({
      message: 'Found item reported successfully!',
      foundItem: foundItem.toPublicJSON()
    });
  } catch (err) {
    console.error('Error creating found item:', err);
    res.status(500).json({ message: err.message || 'Server error creating found item.' });
  }
};

exports.getFoundItems = async (req, res) => {
  try {
    const { category, status, search, location, sort } = req.query;
    const limit = Math.min(100, Math.max(0, Number.parseInt(req.query.limit, 10) || 0));

    const filter = {};
    // Default to PENDING items unless explicitly requested otherwise
    filter.status = status ? status : 'PENDING';

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (location) {
      filter.locationFound = { $regex: location, $options: 'i' };
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { itemName: regex },
        { brand: regex },
        { color: regex },
        { description: regex },
        { locationFound: regex }
      ];
    }

    let sortOption = { createdAt: -1 }; // Newest first by default
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    const items = await FoundItem.find(filter)
      .populate('postedBy', 'name email batchYear departmentCode section rollNumber')
      .sort(sortOption)
      .limit(limit);

    const publicItems = items.map(item => {
      const json = item.toPublicJSON();
      // Ensure finder identity is sanitized (only first name / public details)
      if (item.postedBy) {
        json.finderName = item.postedBy.name ? item.postedBy.name.split(' ')[0] : 'Finder';
        delete json.postedBy;
      }
      return json;
    });

    res.json(publicItems);
  } catch (err) {
    console.error('Error fetching found items:', err);
    res.status(500).json({ message: 'Server error fetching found items.' });
  }
};

exports.getMyFoundItems = async (req, res) => {
  try {
    const items = await FoundItem.find({ postedBy: req.user.userId }).sort({ createdAt: -1 });
    const publicItems = items.map(item => item.toPublicJSON());
    res.json(publicItems);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching your posts.' });
  }
};

exports.getFoundItemById = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id)
      .populate('postedBy', 'name batchYear departmentCode section');

    if (!item) {
      return res.status(404).json({ message: 'Found item not found.' });
    }

    const json = item.toPublicJSON();
    if (item.postedBy) {
      json.finderName = item.postedBy.name ? item.postedBy.name.split(' ')[0] : 'Finder';
      json.finderDept = `${item.postedBy.departmentCode || ''} (Batch ${item.postedBy.batchYear || ''})`;
      // Never expose contact info or full details
      delete json.postedBy;
    }

    res.json(json);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching item details.' });
  }
};

exports.updateFoundItem = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // Critical authorization check: only owner can edit
    if (item.postedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden: You can only edit your own posts.' });
    }

    const { itemName, category, brand, color, description, locationFound } = req.body;
    if (itemName) item.itemName = itemName.trim();
    if (category) item.category = category.trim();
    if (brand !== undefined) item.brand = brand.trim();
    if (color) item.color = color.trim();
    if (description) item.description = description.trim();
    if (locationFound) item.locationFound = locationFound.trim();

    await item.save();
    res.json({ message: 'Found item updated successfully.', item: item.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating item.' });
  }
};

exports.deleteFoundItem = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    if (item.postedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own posts.' });
    }

    // Remove Cloudinary image
    if (item.imagePublicId) {
      await ImageUploadService.deleteImage(item.imagePublicId);
    }

    await FoundItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Found item deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting item.' });
  }
};

exports.markDelivered = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // Critical authorization check: only finder can mark delivered
    if (item.postedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden: Only the finder can mark an item as delivered.' });
    }

    if (item.status === 'DELIVERED') return res.status(409).json({ message: 'This item is already delivered.' });
    if (item.status === 'HANDOVER_PENDING') return res.status(409).json({ message: 'Waiting for the owner to confirm receipt.' });

    const conversation = await Conversation.findOne({ foundItemId: item._id, finderId: req.user.userId }).sort({ updatedAt: -1 });
    if (!conversation) return res.status(409).json({ message: 'A verified owner conversation is required before handover.' });

    item.status = 'HANDOVER_PENDING';
    item.handoverClaimantId = conversation.claimantId;
    item.handedOverAt = new Date();
    item.deliveredAt = null;
    await item.save();

    await Notification.create({
      userId: conversation.claimantId,
      type: 'HANDOVER_REQUESTED',
      message: 'The finder says your item was handed over. Please confirm whether you received it.',
      relatedItemId: item._id
    });

    res.json({ message: 'Handover marked. Waiting for the owner to confirm receipt.', item: item.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Server error marking item delivered.' });
  }
};

exports.confirmHandover = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (item.status === 'DELIVERED') return res.status(409).json({ message: 'This handover is already complete.' });
    if (item.status !== 'HANDOVER_PENDING' || !item.handoverClaimantId) {
      return res.status(409).json({ message: 'There is no handover waiting for confirmation.' });
    }
    if (item.handoverClaimantId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only the verified owner can confirm this handover.' });
    }

    if (req.body.received !== true) {
      item.status = 'PENDING';
      item.handoverClaimantId = null;
      item.handedOverAt = null;
      await item.save();
      await Notification.create({ userId: item.postedBy, type: 'HANDOVER_DECLINED', message: 'The owner has not received the item yet.', relatedItemId: item._id });
      return res.json({ message: 'The item remains pending. You can continue arranging the return.', item: item.toPublicJSON() });
    }

    item.status = 'DELIVERED';
    item.deliveredAt = new Date();
    await item.save();

    const matchedMissingRequestIds = await Match.distinct('missingRequestId', { foundItemId: item._id });
    if (matchedMissingRequestIds.length) {
      await MissingRequest.updateMany(
        { _id: { $in: matchedMissingRequestIds }, userId: req.user.userId, status: { $in: ['ACTIVE', 'MATCHED'] } },
        { $set: { status: 'CLOSED' } }
      );
    }

    await Promise.all([
      Notification.create({ userId: item.postedBy, type: 'ITEM_DELIVERED', message: 'The owner confirmed receiving the item. Item reunited!', relatedItemId: item._id }),
      Notification.create({ userId: req.user.userId, type: 'ITEM_DELIVERED', message: 'Your item has been successfully returned.', relatedItemId: item._id })
    ]);
    res.json({ message: 'Item reunited successfully!', item: item.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Could not confirm the handover.' });
  }
};

exports.thankFinder = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (item.status !== 'DELIVERED' || item.handoverClaimantId?.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Thanks can only be sent by the verified owner after delivery.' });
    }
    const user = await User.findById(req.user.userId);
    if (user.thankedReturnIds.some(id => id.toString() === item._id.toString())) {
      return res.status(409).json({ message: 'You already thanked this finder.' });
    }
    user.thankedReturnIds.push(item._id);
    await user.save();
    await Notification.create({ userId: item.postedBy, type: 'FINDER_THANKED', message: 'The owner thanked you for helping return their item.', relatedItemId: item._id });
    res.json({ message: 'Thanks sent to the finder.' });
  } catch {
    res.status(500).json({ message: 'Could not thank the finder.' });
  }
};
