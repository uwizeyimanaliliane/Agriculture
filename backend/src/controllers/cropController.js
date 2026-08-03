const path = require('path');
const Crop = require('../models/Crop');
const Farmer = require('../models/Farmer');


const toPhotoUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const filename = path.basename(filePath);
  return `/uploads/${filename}`;
};

const transformCrop = (crop) => {
  if (crop.photos && Array.isArray(crop.photos)) {
    crop.photos = crop.photos.map(p => toPhotoUrl(p)).filter(Boolean);
  }
  return crop;
};

exports.addCrop = async (req, res, next) => {
  try {
    const { name, category, description, quantity, quantityUnit, price, priceUnit, isPreHarvest, estimatedHarvestDate } = req.body;

    let farmer = await Farmer.findOne({ user: req.user._id });
    if (!farmer) {
      farmer = await Farmer.create({ user: req.user._id });
    }

    const photos = req.files ? req.files.map(f => f.path) : [];

    const crop = await Crop.create({
      farmer: farmer._id,
      user: req.user._id,
      name,
      category,
      description,
      quantity,
      quantityUnit,
      price,
      priceUnit,
      photos,
      status: 'pending_admin',
      isPreHarvest: isPreHarvest || false,
      estimatedHarvestDate,
      location: req.user.location || {},
    });

    // Don't notify buyers — crop only visible to admin until approved

    res.status(201).json({ crop: transformCrop(crop.toObject()) });
  } catch (error) {
    next(error);
  }
};

exports.getMyCrops = async (req, res, next) => {
  try {
    const crops = await Crop.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ crops: crops.map(c => transformCrop(c.toObject())) });
  } catch (error) {
    next(error);
  }
};

exports.getCropById = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id)
      .populate({
        path: 'user',
        select: 'name email phone avatar location',
      })
      .populate({
        path: 'farmer',
        select: 'trustScore verifiedBadge rating successfulDeliveries farmDetails',
      });

    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    res.json({ crop: transformCrop(crop.toObject()) });
  } catch (error) {
    next(error);
  }
};

exports.getAvailableCrops = async (req, res, next) => {
  try {
    const { category, district, minPrice, maxPrice, isPreHarvest, page = 1, limit = 20 } = req.query;
    const query = { status: { $in: ['available', 'approved'] } };

    if (category) query.category = category;
    if (district) query['location.district'] = district;
    if (minPrice) query.price = { ...query.price, $gte: parseFloat(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };
    if (isPreHarvest === 'true') query.isPreHarvest = true;

    const crops = await Crop.find(query)
      .populate({
        path: 'user',
        select: 'name avatar location',
      })
      .populate({
        path: 'farmer',
        select: 'trustScore verifiedBadge',
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Crop.countDocuments(query);

    res.json({ crops: crops.map(c => transformCrop(c.toObject())), total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.updateCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findOne({ _id: req.params.id, user: req.user._id });
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found or unauthorized' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      crop[key] = updates[key];
    });

    if (req.files && req.files.length > 0) {
      crop.photos = req.files.map(f => f.path);
    }

    await crop.save();
    res.json({ crop: transformCrop(crop.toObject()) });
  } catch (error) {
    next(error);
  }
};

exports.deleteCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found or unauthorized' });
    }
    res.json({ message: 'Crop deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getPendingCrops = async (req, res, next) => {
  try {
    const crops = await Crop.find({ status: 'pending_admin' })
      .populate({ path: 'user', select: 'name email phone location' })
      .populate({ path: 'farmer', select: 'trustScore verifiedBadge' })
      .sort({ createdAt: -1 });
    res.json({ crops: crops.map(c => transformCrop(c.toObject())) });
  } catch (error) {
    next(error);
  }
};

exports.approveCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }
    if (crop.status !== 'pending_admin') {
      return res.status(400).json({ message: 'Crop is not in pending status' });
    }

    crop.status = 'available';
    await crop.save();

    // Notify farmer about approval and posting
    try {
      const { sendNotification } = require('../services/notificationService');
      await sendNotification({
        userId: crop.user,
        type: 'system',
        title: 'Crop Approved',
        message: `Your crop "${crop.name}" has been approved and posted for buyers. Transporters can still bid to help deliver it.`,
        data: { cropId: crop._id },
      });
    } catch (notifErr) {
      console.error('Failed to notify farmer about approval:', notifErr);
    }

    // Notify all transporters to submit their transport price bid
    try {
      const User = require('../models/User');
      const transporters = await User.find({ role: 'transporter' }).select('_id').lean();
      if (transporters.length > 0) {
        const Notification = require('../models/Notification');
        const notifications = transporters.map(t => ({
          user: t._id,
          type: 'new_transport_job',
          title: `Set Your Price: ${crop.name}`,
          message: `${crop.name} (${crop.quantity} ${crop.quantityUnit}) from ${crop.location?.district || crop.location?.province || 'Rwanda'}. Submit your transport price to get the job.`,
          data: { cropId: crop._id },
        }));
        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      console.error('Failed to notify transporters:', notifErr);
    }

    res.json({ crop: transformCrop(crop.toObject()) });
  } catch (error) {
    next(error);
  }
};

exports.submitTransportBid = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Crop not found' });
    if (!['approved', 'available'].includes(crop.status)) return res.status(400).json({ message: 'Crop is not open for transport bids' });
    if (crop.transportPrice > 0) return res.status(400).json({ message: 'Transport already assigned for this crop' });

    const price = parseFloat(req.body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: 'Price must be a positive number' });
    }

    const existing = crop.transportBids.find(
      b => b.transporter.toString() === req.user._id.toString() && b.status === 'pending'
    );
    if (existing) {
      existing.price = price;
    } else {
      crop.transportBids.push({ transporter: req.user._id, price });
    }
    await crop.save();

    res.json({ message: 'Transport bid submitted', bid: { price } });
  } catch (error) {
    next(error);
  }
};

exports.getTransportBids = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id)
      .populate('transportBids.transporter', 'name phone email');
    if (!crop) return res.status(404).json({ message: 'Crop not found' });
    res.json({ bids: crop.transportBids });
  } catch (error) {
    next(error);
  }
};

exports.acceptTransportBid = async (req, res, next) => {
  try {
    const { bidId } = req.params;
    const crop = await Crop.findById(req.params.id)
      .populate('transportBids.transporter', 'name phone');
    if (!crop) return res.status(404).json({ message: 'Crop not found' });
    if (crop.transportPrice > 0) return res.status(400).json({ message: 'Transport already assigned' });

    const bid = crop.transportBids.id(bidId);
    if (!bid) return res.status(404).json({ message: 'Bid not found' });
    if (bid.status !== 'pending') return res.status(400).json({ message: 'Bid is no longer pending' });

    bid.status = 'accepted';
    crop.transportPrice = bid.price;
    crop.status = 'available'; // Mark as available for buyers now that transport is arranged

    // Mark other bids as declined
    crop.transportBids.forEach(b => {
      if (b._id.toString() !== bidId && b.status === 'pending') b.status = 'declined';
    });

    await crop.save();

    // Send notifications (wrapped in try-catch to not block response)
    try {
      const { sendNotification } = require('../services/notificationService');
      await sendNotification({
        userId: bid.transporter._id,
        type: 'bid_accepted',
        title: 'Transport Bid Accepted',
        message: `Your bid of ${bid.price.toLocaleString()} RWF for "${crop.name}" was accepted. You will be assigned when a buyer orders.`,
        data: { cropId: crop._id, bidPrice: bid.price },
      });

      await sendNotification({
        userId: crop.user,
        type: 'transport_assigned',
        title: 'Transporter Selected',
        message: `A transporter (${bid.transporter.name}) has been assigned for "${crop.name}" at ${bid.price.toLocaleString()} RWF. The crop is now visible to buyers.`,
        data: { cropId: crop._id },
      });
    } catch (notifErr) {
      console.error('Failed to send transport bid notifications:', notifErr);
    }

    res.json({ crop: transformCrop(crop.toObject()), message: `Transport bid of ${bid.price.toLocaleString()} RWF accepted` });
  } catch (error) {
    next(error);
  }
};

exports.rejectCrop = async (req, res, next) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }
    if (crop.status !== 'pending_admin') {
      return res.status(400).json({ message: 'Crop is not in pending status' });
    }

    const reason = req.body.reason?.toString().trim();
    if (!reason) {
      return res.status(400).json({ message: 'Reject reason is required' });
    }

    crop.status = 'rejected';
    crop.rejectReason = reason;
    await crop.save();

    const { sendNotification } = require('../services/notificationService');
    await sendNotification({
      userId: crop.user,
      type: 'system',
      title: 'Crop Rejected',
      message: `Your crop "${crop.name}" was rejected: ${reason}`,
      data: { cropId: crop._id, rejectReason: reason },
    });

    res.json({ crop: transformCrop(crop.toObject()) });
  } catch (error) {
    next(error);
  }
};

exports.getNeedingTransport = async (req, res, next) => {
  try {
    const crops = await Crop.find({ status: { $in: ['approved', 'available'] }, transportPrice: 0 })
      .populate('user', 'name phone location')
      .populate('farmer', 'trustScore verifiedBadge')
      .sort({ createdAt: -1 });

    const mapped = crops.map(c => {
      const obj = transformCrop(c.toObject());
      const myBid = c.transportBids?.find(
        b => b.transporter?.toString() === req.user._id.toString() && b.status === 'pending'
      );
      obj.myBid = myBid ? { _id: myBid._id, price: myBid.price } : null;
      return obj;
    });

    res.json({ crops: mapped });
  } catch (error) {
    next(error);
  }
};
