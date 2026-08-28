const MissingRequest = require('../models/MissingRequest');
const FoundItem = require('../models/FoundItem');
const FoundEvidence = require('../models/FoundEvidence');
const Conversation = require('../models/Conversation');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const ImageUploadService = require('../services/ImageUploadService');
const MatchingService = require('../services/MatchingService');

const sanitize = doc => { const o = doc.toObject(); delete o.privateVerificationDetails; delete o.additionalPrivateDetails; return o; };
const secretMatch = (expected, supplied) => {
  const words = String(expected || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  const answer = new Set(String(supplied || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  return words.length > 0 && words.some(w => answer.has(w));
};

exports.createMissingRequest = async (req, res) => {
  try {
    const b = req.body, description = b.publicDescription || b.description;
    if (!b.itemName || !b.category || !b.color || !description || !b.lastKnownLocation)
      return res.status(400).json({ message: 'Item name, category, color, public description, and location are required.' });
    let image = { imageUrl: '', imagePublicId: '' };
    if (req.file) image = await ImageUploadService.uploadImage(req.file.buffer, 'lostlink_missing_items');
    const request = await MissingRequest.create({ ...image, userId: req.user.userId, itemName: b.itemName.trim(), category: b.category.trim(), brand: (b.brand || '').trim(), color: b.color.trim(), description: description.trim(), lastKnownLocation: b.lastKnownLocation.trim(), approximateLostDate: b.approximateLostDate || new Date(), approximateLostTime: b.approximateLostTime || '', privateVerificationDetails: (b.privateVerificationDetails || b.additionalPrivateDetails || '').trim() });
    const matches = [];
    for (const item of await FoundItem.find({ status: 'PENDING' })) {
      const result = MatchingService.calculateMatch(request, item);
      if (result.score >= 60) {
        const match = await Match.findOneAndUpdate({ foundItemId: item._id, missingRequestId: request._id }, { score: result.score, confidence: result.confidence, reasons: result.reasons }, { upsert: true, new: true });
        matches.push({ matchId: match._id, foundItem: item.toPublicJSON(), ...result });
        await Notification.create({ userId: request.userId, type: 'POSSIBLE_MATCH', message: `Possible match (${result.score}%) found for your missing ${request.itemName}.`, relatedItemId: item._id });
      }
    }
    res.status(201).json({ message: 'Missing item posted successfully. LostLink will keep looking for possible matches.', missingRequest: sanitize(request), matches });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not create the missing-item post.' }); }
};

exports.getMissingRequests = async (req, res) => {
  try {
    const q = req.query, filter = { status: q.status || 'ACTIVE' };
    if (q.category && q.category !== 'All') filter.category = q.category;
    for (const [key, field] of [['brand','brand'],['color','color'],['location','lastKnownLocation']]) if (q[key]) filter[field] = { $regex: q[key], $options: 'i' };
    if (q.search) filter.$or = ['itemName','brand','color','description','lastKnownLocation'].map(k => ({ [k]: { $regex: q.search, $options: 'i' } }));
    if (q.date) { const from = new Date(q.date), to = new Date(q.date); to.setDate(to.getDate() + 1); filter.approximateLostDate = { $gte: from, $lt: to }; }
    const limit = Math.min(100, Math.max(0, Number.parseInt(q.limit, 10) || 0));
    res.json(await MissingRequest.find(filter).select('-privateVerificationDetails -additionalPrivateDetails').sort({ createdAt: -1 }).limit(limit).lean());
  } catch (e) { res.status(500).json({ message: 'Could not load missing items.' }); }
};
exports.getMyMissingRequests = async (req, res) => { try { res.json(await MissingRequest.find({ userId: req.user.userId }).select('-privateVerificationDetails -additionalPrivateDetails').sort({ createdAt: -1 })); } catch { res.status(500).json({ message: 'Could not load your requests.' }); } };
exports.getMyEvidence = async (req, res) => { try { res.json(await FoundEvidence.find({ finderId: req.user.userId }).populate('missingRequestId','itemName imageUrl status').sort({ createdAt: -1 })); } catch { res.status(500).json({ message: 'Could not load your finder responses.' }); } };
exports.getMissingRequestById = async (req, res) => { try { const d = await MissingRequest.findById(req.params.id).select('-privateVerificationDetails -additionalPrivateDetails'); if (!d) return res.status(404).json({ message: 'Missing request not found.' }); res.json(d); } catch { res.status(500).json({ message: 'Could not load the missing item.' }); } };
exports.getMatchesForMissingRequest = async (req, res) => { try { const r = await MissingRequest.findById(req.params.id); if (!r) return res.status(404).json({ message: 'Missing request not found.' }); if (r.userId.toString() !== req.user.userId) return res.status(403).json({ message: 'Only the owner can view matches.' }); const ms = await Match.find({ missingRequestId: r._id }).populate('foundItemId').sort({ score: -1 }); res.json(ms.map(m => ({ _id: m._id, foundItem: m.foundItemId?.toPublicJSON(), score: m.score, confidence: m.confidence, reasons: m.reasons }))); } catch { res.status(500).json({ message: 'Could not load matches.' }); } };

exports.submitFoundEvidence = async (req, res) => {
  try {
    const missing = await MissingRequest.findById(req.params.id).select('+privateVerificationDetails +additionalPrivateDetails');
    if (!missing || missing.status !== 'ACTIVE') return res.status(409).json({ message: 'This report is no longer accepting responses.' });
    if (missing.userId.toString() === req.user.userId) return res.status(400).json({ message: 'You cannot respond to your own report.' });
    if (await FoundEvidence.exists({ missingRequestId: missing._id, finderId: req.user.userId, status: 'PENDING_REVIEW' })) return res.status(409).json({ message: 'You already have evidence pending review.' });
    if (await FoundEvidence.countDocuments({ finderId: req.user.userId, status: 'REJECTED' }) >= 3) return res.status(429).json({ message: 'Submissions are temporarily limited after repeated rejected responses.' });
    const b = req.body, detailLength = [b.foundLocation,b.category,b.brand,b.color,b.description,b.verificationAnswers].filter(Boolean).join(' ').length;
    if (!req.file && detailLength < 35) return res.status(400).json({ message: 'Upload a photo or provide enough descriptive evidence.' });
    let image = { imageUrl: '', imagePublicId: '' };
    if (req.file) { const u = await ImageUploadService.uploadImage(req.file.buffer, 'lostlink_found_evidence'); image = { evidenceImageUrl: u.imageUrl, evidenceImagePublicId: u.imagePublicId }; }
    const result = MatchingService.calculateMatch(missing, { itemName: b.description, category: b.category, brand: b.brand, color: b.color, description: `${b.description || ''} ${b.verificationAnswers || ''}`, locationFound: b.foundLocation, dateFound: b.foundDate });
    const privateOk = secretMatch(missing.privateVerificationDetails || missing.additionalPrivateDetails, b.verificationAnswers);
    const score = Math.min(100, result.score + (privateOk ? 15 : 0)), confidence = score >= 80 ? 'HIGH' : score >= 60 ? 'POSSIBLE' : 'LOW';
    if (score < 30 && !privateOk) return res.status(422).json({ message: 'This item does not appear to closely match the missing report.', matchScore: score, confidence });
    const evidence = await FoundEvidence.create({ ...image, missingRequestId: missing._id, finderId: req.user.userId, foundLocation: b.foundLocation, foundDate: b.foundDate || null, foundTime: b.foundTime, category: b.category, brand: b.brand, color: b.color, description: b.description, verificationAnswers: b.verificationAnswers, matchScore: score, confidence, matchReasons: privateOk ? [...result.reasons, 'Identifying details match'] : result.reasons, privateVerificationMatched: privateOk });
    await Notification.create({ userId: missing.userId, type: 'FOUND_EVIDENCE_SUBMITTED', message: `Someone may have found your ${missing.itemName}. ${score}% match.`, relatedItemId: evidence._id });
    res.status(201).json({ message: 'Thanks! Your response has been sent to the owner for review.', evidence: { _id: evidence._id, matchScore: score, confidence } });
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: 'You already have evidence pending review.' }); console.error(e); res.status(500).json({ message: 'Could not submit evidence.' }); }
};

exports.getEvidenceForMissing = async (req, res) => { try { const m = await MissingRequest.findById(req.params.id); if (!m) return res.status(404).json({ message: 'Missing request not found.' }); if (m.userId.toString() !== req.user.userId) return res.status(403).json({ message: 'Only the owner can review evidence.' }); res.json(await FoundEvidence.find({ missingRequestId: m._id }).populate('finderId','name').sort({ createdAt: -1 })); } catch { res.status(500).json({ message: 'Could not load evidence.' }); } };
async function decide(req, res, accept) { try { const e = await FoundEvidence.findById(req.params.evidenceId); if (!e || e.status !== 'PENDING_REVIEW') return res.status(409).json({ message: 'This evidence has already been reviewed.' }); const m = await MissingRequest.findById(e.missingRequestId); if (!m) return res.status(404).json({ message: 'Missing request not found.' }); if (m.userId.toString() !== req.user.userId) return res.status(403).json({ message: 'Only the owner can review evidence.' }); e.status = accept ? 'ACCEPTED' : 'REJECTED'; await e.save(); if (!accept) { await Notification.create({ userId: e.finderId, type: 'FOUND_EVIDENCE_REJECTED', message: "This item wasn't confirmed as a match. Thanks for trying to help.", relatedItemId: e._id }); return res.json({ message: 'Evidence rejected. The report remains active.' }); } m.status = 'MATCHED'; m.acceptedEvidenceId = e._id; await m.save(); let c = await Conversation.findOne({ foundEvidenceId: e._id }); if (!c) c = await Conversation.create({ missingRequestId: m._id, foundEvidenceId: e._id, finderId: e.finderId, claimantId: m.userId }); await Notification.create({ userId: e.finderId, type: 'FOUND_EVIDENCE_ACCEPTED', message: 'Great news! The owner confirmed a possible match. Chat is now unlocked.', relatedItemId: e._id }); res.json({ message: 'Evidence accepted. Chat is now unlocked.', conversationId: c._id }); } catch (e) { console.error(e); res.status(500).json({ message: 'Could not review evidence.' }); } }
exports.acceptEvidence = (req,res) => decide(req,res,true); exports.rejectEvidence = (req,res) => decide(req,res,false);
exports.markRecovered = async (req,res) => { try { const m = await MissingRequest.findById(req.params.id); if (!m) return res.status(404).json({ message: 'Missing request not found.' }); if (m.userId.toString() !== req.user.userId) return res.status(403).json({ message: 'Only the owner can mark it recovered.' }); if (m.status !== 'MATCHED') return res.status(409).json({ message: 'Only an accepted match can be marked recovered.' }); m.status='RECOVERED'; m.recoveredAt=new Date(); await m.save(); res.json({ message:'Item recovered successfully!', missingRequest:sanitize(m) }); } catch { res.status(500).json({ message:'Could not mark item recovered.' }); } };
exports.deleteMissingRequest = async (req,res) => { try { const m=await MissingRequest.findById(req.params.id); if(!m)return res.status(404).json({message:'Request not found.'}); if(m.userId.toString()!==req.user.userId)return res.status(403).json({message:'You can only close your own request.'}); if(['MATCHED','RECOVERED'].includes(m.status))return res.status(409).json({message:'Matched or recovered requests cannot be deleted.'}); m.status='CLOSED'; await m.save(); res.json({message:'Missing request closed.'}); } catch { res.status(500).json({message:'Could not close request.'}); } };
