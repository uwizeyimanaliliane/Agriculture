const path = require('path');
const Auction = require('../models/Auction');
const Crop = require('../models/Crop');
const Bid = require('../models/Bid');
const Escrow = require('../models/Escrow');
const Farmer = require('../models/Farmer');
const { createEscrow, confirmDeposit } = require('../services/escrowService');
const { notifyNewBid, notifyOutbid, notifyAuctionWon, notifyPaymentReceived } = require('../services/notificationService');

const toPhotoUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const filename = path.basename(filePath);
  return `/uploads/${filename}`;
};

const transformCropPhotos = (obj) => {
  if (obj && obj.crop && obj.crop.photos && Array.isArray(obj.crop.photos)) {
    obj.crop.photos = obj.crop.photos.map(p => toPhotoUrl(p)).filter(Boolean);
  }
  return obj;
};

exports.createAuction = async (req, res, next) => {
  try {
    const { cropId, startingPrice, reservePrice, endDate, minimumIncrement } = req.body;

    const crop = await Crop.findById(cropId);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }
    if (crop.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your crop' });
    }

    const farmer = await Farmer.findOne({ user: req.user._id });

    const auction = await Auction.create({
      crop: cropId,
      farmer: farmer._id,
      user: req.user._id,
      startingPrice,
      currentHighestBid: startingPrice,
      reservePrice,
      endDate,
      minimumIncrement: minimumIncrement || 5000,
    });

    crop.status = 'in_auction';
    await crop.save();

    res.status(201).json({ auction });
  } catch (error) {
    next(error);
  }
};

exports.getActiveAuctions = async (req, res, next) => {
  try {
    const { category, district, page = 1, limit = 20 } = req.query;
    const query = { status: 'active', endDate: { $gt: new Date() } };

    const auctions = await Auction.find(query)
      .populate({
        path: 'crop',
        match: category ? { category } : {},
        select: 'name category quantity quantityUnit photos location',
      })
      .populate({
        path: 'user',
        select: 'name avatar location',
      })
      .populate({
        path: 'highestBidder',
        select: 'name',
      })
      .sort({ endDate: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const filteredAuctions = auctions.filter(a => a.crop !== null);
    const total = await Auction.countDocuments(query);

    res.json({ auctions: filteredAuctions.map(a => transformCropPhotos(a.toObject())), total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getAuctionById = async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('crop')
      .populate('user', 'name avatar location')
      .populate('highestBidder', 'name email')
      .populate({
        path: 'bids',
        options: { sort: { amount: -1 } },
        populate: { path: 'bidder', select: 'name' },
      });

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    res.json({ auction: transformCropPhotos(auction.toObject()) });
  } catch (error) {
    next(error);
  }
};

exports.placeBid = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }
    if (auction.status !== 'active') {
      return res.status(400).json({ message: 'Auction is not active' });
    }
    if (new Date() > new Date(auction.endDate)) {
      auction.status = 'closed';
      await auction.save();
      return res.status(400).json({ message: 'Auction has ended' });
    }
    if (auction.user.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot bid on your own auction' });
    }

    const minimumBid = auction.currentHighestBid + auction.minimumIncrement;
    if (amount < minimumBid) {
      return res.status(400).json({
        message: `Bid must be at least ${minimumBid.toLocaleString()} RWF`,
      });
    }

    const bid = await Bid.create({
      auction: auction._id,
      bidder: req.user._id,
      amount,
    });

    if (auction.highestBidder && auction.highestBidder.toString() !== req.user._id.toString()) {
      await notifyOutbid(auction.highestBidder, auction._id, amount);
    }

    auction.currentHighestBid = amount;
    auction.highestBidder = req.user._id;
    auction.bids.push(bid._id);
    await auction.save();

    await notifyNewBid(auction.user, auction._id, amount);

    res.status(201).json({ bid, auction });
  } catch (error) {
    next(error);
  }
};

exports.closeAuction = async (req, res, next) => {
  try {
    const auction = await Auction.findOne({ _id: req.params.id, user: req.user._id });
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found or unauthorized' });
    }

    auction.status = 'closed';

    if (auction.highestBidder) {
      auction.winner = auction.highestBidder;
      auction.winningBid = auction.bids[auction.bids.length - 1];

      const escrow = await createEscrow({
        auction: auction._id,
        crop: auction.crop,
        buyer: auction.highestBidder,
        farmer: auction.user,
        amount: auction.currentHighestBid,
      });

      await notifyAuctionWon(auction.highestBidder, auction._id, auction.currentHighestBid);
    }

    await auction.save();

    const crop = await Crop.findById(auction.crop);
    if (auction.winner) {
      crop.status = 'sold';
    } else {
      crop.status = 'available';
    }
    await crop.save();

    res.json({ auction });
  } catch (error) {
    next(error);
  }
};

exports.getMyAuctions = async (req, res, next) => {
  try {
    const auctions = await Auction.find({ user: req.user._id })
      .populate('crop', 'name category quantity quantityUnit photos')
      .sort({ createdAt: -1 });
    res.json({ auctions: auctions.map(a => transformCropPhotos(a.toObject())) });
  } catch (error) {
    next(error);
  }
};

exports.getMyBids = async (req, res, next) => {
  try {
    const bids = await Bid.find({ bidder: req.user._id })
      .populate({
        path: 'auction',
        populate: {
          path: 'crop',
          select: 'name category quantity quantityUnit photos',
        },
      })
      .sort({ createdAt: -1 });
    res.json({ bids: bids.map(b => {
      const obj = b.toObject();
      if (obj.auction) transformCropPhotos(obj.auction);
      return obj;
    }) });
  } catch (error) {
    next(error);
  }
};

exports.checkAndCloseExpiredAuctions = async () => {
  try {
    const expiredAuctions = await Auction.find({
      status: 'active',
      endDate: { $lte: new Date() },
    });

    for (const auction of expiredAuctions) {
      auction.status = 'closed';
      if (auction.highestBidder) {
        auction.winner = auction.highestBidder;

        const escrow = await createEscrow({
          auction: auction._id,
          crop: auction.crop,
          buyer: auction.highestBidder,
          farmer: auction.user,
          amount: auction.currentHighestBid,
        });

        await notifyAuctionWon(auction.highestBidder, auction._id, auction.currentHighestBid);
      }
      await auction.save();

      const crop = await Crop.findById(auction.crop);
      if (crop) {
        crop.status = auction.winner ? 'sold' : 'available';
        await crop.save();
      }
    }
  } catch (error) {
    console.error('Error closing expired auctions:', error);
  }
};
