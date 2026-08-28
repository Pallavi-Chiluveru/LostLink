const MissingRequest = require('../models/MissingRequest');
const FoundItem = require('../models/FoundItem');
const Match = require('../models/Match');
const ClaimRequest = require('../models/ClaimRequest');

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [activeMissingRequests, pendingItemsCount, verifiedClaimItemIds] = await Promise.all([
      MissingRequest.find({ userId, status: { $in: ['ACTIVE', 'MATCHED'] } }).select('_id status').lean(),
      FoundItem.countDocuments({ postedBy: userId, status: 'PENDING' }),
      ClaimRequest.distinct('foundItemId', { claimantId: userId, status: 'VERIFIED' })
    ]);

    const activeMissingIds = activeMissingRequests.filter(request => request.status === 'ACTIVE').map(request => request._id);

    const possibleMatchesCount = activeMissingIds.length === 0
      ? 0
      : await Match.countDocuments({
          missingRequestId: { $in: activeMissingIds },
          foundItemId: { $in: await FoundItem.distinct('_id', { status: 'PENDING' }) }
        });

    // A reunion involves either the finder who delivered the item or its verified claimant.
    // countDocuments counts each delivered item once even if the user has both relationships.
    const deliveredCount = await FoundItem.countDocuments({
      status: 'DELIVERED',
      $or: [
        { postedBy: userId },
        { _id: { $in: verifiedClaimItemIds } }
      ]
    });

    const recoveredCount = await MissingRequest.countDocuments({ userId, status: 'RECOVERED', matchedFoundItemId: null });
    res.json({
      pendingItemsCount,
      activeMissingCount: activeMissingIds.length,
      possibleMatchesCount,
      itemsReunitedCount: deliveredCount + recoveredCount
    });
  } catch (err) {
    console.error('Error fetching dashboard statistics:', err);
    res.status(500).json({ message: 'Server error fetching dashboard statistics.' });
  }
};
