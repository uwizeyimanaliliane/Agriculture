const Farmer = require('../models/Farmer');
const User = require('../models/User');
const Crop = require('../models/Crop');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const { notifyVerificationUpdate } = require('../services/notificationService');

exports.getFarmerProfile = async (req, res, next) => {
  try {
    const farmer = await Farmer.findOne({ user: req.params.id || req.user._id })
      .populate('user', 'name email phone avatar location')
      .populate('cooperative', 'name');

    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    res.json({ farmer });
  } catch (error) {
    next(error);
  }
};

exports.updateFarmDetails = async (req, res, next) => {
  try {
    const { farmName, farmSize, farmSizeUnit, cropsGrown, description } = req.body;

    const farmer = await Farmer.findOneAndUpdate(
      { user: req.user._id },
      {
        farmDetails: { farmName, farmSize, farmSizeUnit, cropsGrown, description },
      },
      { new: true }
    );

    res.json({ farmer });
  } catch (error) {
    next(error);
  }
};

exports.submitVerificationRequest = async (req, res, next) => {
  try {
    const farmer = await Farmer.findOne({ user: req.user._id });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    farmer.verificationStatus = 'in_review';
    await farmer.save();

    await notifyVerificationUpdate(req.user._id, 'in_review');

    res.json({ message: 'Verification request submitted', farmer });
  } catch (error) {
    next(error);
  }
};

exports.getVerificationStatus = async (req, res, next) => {
  try {
    const farmer = await Farmer.findOne({ user: req.user._id })
      .select('verificationStatus verificationDetails trustScore verifiedBadge inspectionReports');

    res.json({ farmer });
  } catch (error) {
    next(error);
  }
};

exports.submitInspectionReport = async (req, res, next) => {
  try {
    const { farmerId, findings, status } = req.body;
    const photos = req.files ? req.files.map(f => f.path) : [];

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    farmer.inspectionReports.push({
      agent: req.user._id,
      reportDate: new Date(),
      findings,
      status,
      photos,
    });

    if (status === 'pass') {
      farmer.verificationDetails.farmInspected = true;
      farmer.verificationDetails.photosSubmitted = true;
      farmer.verificationDetails.landVerified = true;

      if (farmer.verificationDetails.cooperativeApproved) {
        farmer.verificationStatus = 'verified';
        farmer.verifiedBadge = true;
        farmer.trustScore = 50;
        await notifyVerificationUpdate(farmer.user, 'verified');
      }
    }

    await farmer.save();
    res.json({ farmer });
  } catch (error) {
    next(error);
  }
};

exports.getRecentActivity = async (req, res, next) => {
  try {
    const [crops, auctions] = await Promise.all([
      Crop.find({ user: req.user._id })
        .select('name category quantity quantityUnit price status createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      Auction.find({ user: req.user._id })
        .populate('crop', 'name')
        .select('crop status currentHighestBid startDate endDate createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const auctionIds = auctions.map(a => a._id);
    const bids = auctionIds.length > 0 ? await Bid.find({ auction: { $in: auctionIds } })
      .populate('bidder', 'name')
      .select('amount createdAt')
      .sort({ createdAt: -1 })
      .limit(5) : [];

    const activities = [];

    crops.forEach(c => activities.push({
      type: 'crop_added',
      description: `Added ${c.name} (${c.quantity} ${c.quantityUnit})`,
      date: c.createdAt,
      icon: '🌱',
    }));

    auctions.forEach(a => activities.push({
      type: 'auction_created',
      description: `Started auction for ${a.crop?.name || 'crop'}`,
      date: a.createdAt,
      icon: '🔨',
    }));

    auctions.filter(a => a.status === 'closed' && a.currentHighestBid > 0).forEach(a => activities.push({
      type: 'auction_closed',
      description: `Sold ${a.crop?.name || 'crop'} at ${a.currentHighestBid.toLocaleString()} RWF`,
      date: a.endDate || a.createdAt,
      icon: '💰',
    }));

    bids.forEach(b => activities.push({
      type: 'bid_received',
      description: `New bid of ${b.amount.toLocaleString()} RWF from ${b.bidder?.name || 'someone'}`,
      date: b.createdAt,
      icon: '📊',
    }));

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    activities.splice(10);

    res.json({ activities });
  } catch (error) {
    next(error);
  }
};

exports.getFarmers = async (req, res, next) => {
  try {
    const { verified, district, page = 1, limit = 20 } = req.query;
    const query = {};

    if (verified === 'true') query.verifiedBadge = true;
    if (district) query['user.location.district'] = district;

    const farmers = await Farmer.find(query)
      .populate('user', 'name email phone avatar location')
      .sort({ trustScore: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Farmer.countDocuments(query);

    res.json({ farmers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};
