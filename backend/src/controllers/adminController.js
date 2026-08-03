const path = require('path');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Crop = require('../models/Crop');
const Auction = require('../models/Auction');
const Escrow = require('../models/Escrow');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');

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

exports.getCrops = async (req, res, next) => {
  try {
    const { search, category, district, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (district) query['location.district'] = district;
    if (status) query.status = status;

    const crops = await Crop.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Crop.countDocuments(query);

    res.json({ crops: crops.map(c => transformCrop(c.toObject())), total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['farmer', 'buyer', 'transporter', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (role === 'farmer') {
      await Farmer.findOneAndUpdate(
        { user: user._id },
        { $setOnInsert: { user: user._id } },
        { upsert: true }
      );
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const currentStatus = user.isVerified;
    user.isVerified = !currentStatus;
    await user.save();

    res.json({ message: `User ${user.isVerified ? 'activated' : 'deactivated'}`, isVerified: user.isVerified });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin users' });

    await Farmer.deleteOne({ user: user._id });
    await Crop.deleteMany({ user: user._id });
    await Delivery.deleteMany({ $or: [{ farmer: user._id }, { buyer: user._id }, { transporter: user._id }] });
    await User.deleteOne({ _id: user._id });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateUserProfile = async (req, res, next) => {
  try {
    const { name, phone, province, district, sector, village } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (province !== undefined) updateData['location.province'] = province;
    if (district !== undefined) updateData['location.district'] = district;
    if (sector !== undefined) updateData['location.sector'] = sector;
    if (village !== undefined) updateData['location.village'] = village;
    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

exports.adminChangePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot change password of another admin' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, farmers, buyers, transporters, totalCrops, pendingCrops, transportPending, activeAuctions, pendingEscrows, awaitingRelease, activeDeliveries, feeData, logisticsData] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'transporter' }),
      Crop.countDocuments(),
      Crop.countDocuments({ status: 'pending_admin' }),
      Crop.countDocuments({ status: 'approved', transportPrice: 0 }),
      Auction.countDocuments({ status: 'active' }),
      Escrow.countDocuments({ status: { $in: ['locked', 'in_transit'] } }),
      Escrow.countDocuments({ status: 'delivered' }),
      Delivery.countDocuments({ status: { $in: ['assigned', 'picked_up', 'in_transit'] } }),
      Escrow.aggregate([
        { $group: { _id: null, total: { $sum: '$platformFee' }, count: { $sum: 1 } } },
      ]),
      Escrow.aggregate([
        { $group: { _id: null, total: { $sum: '$logisticsFee' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalPlatformFees = feeData[0]?.total || 0;
    const totalLogisticsFees = logisticsData[0]?.total || 0;

    res.json({
      totalUsers, farmers, buyers, transporters,
      totalCrops, pendingCrops, transportPending, activeAuctions, pendingEscrows, awaitingRelease, activeDeliveries,
      totalPlatformFees, totalLogisticsFees, totalRevenue: totalPlatformFees + totalLogisticsFees,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEscrows = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const escrows = await Escrow.find(query)
      .populate('buyer', 'name email phone')
      .populate('farmer', 'name email phone')
      .populate('crop', 'name')
      .populate('transporter', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Escrow.countDocuments(query);
    res.json({ escrows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.releaseEscrow = async (req, res, next) => {
  try {
    const escrow = await Escrow.findById(req.params.id)
      .populate('crop', 'name')
      .populate('farmer', '_id name phone')
      .populate('buyer', '_id name phone');
    
    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (escrow.status !== 'delivered') {
      return res.status(400).json({ 
        message: `Delivery must be confirmed first. Current status: ${escrow.status}` 
      });
    }

    // Get the farmer and transfer money to their wallet
    const farmer = await User.findById(escrow.farmer._id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    // Transfer the farmer amount (excluding platform fee) to farmer's wallet
    const previousFarmerBalance = farmer.walletBalance || 0;
    farmer.walletBalance = (farmer.walletBalance || 0) + escrow.farmerAmount;
    await farmer.save();

    console.log(`[releaseEscrow] Transferred ${escrow.farmerAmount} RWF to farmer ${escrow.farmer._id}. Previous: ${previousFarmerBalance}, New: ${farmer.walletBalance}`);

    // Update escrow status
    escrow.status = 'released';
    escrow.releasedAt = new Date();
    await escrow.save();

    // Notify farmer
    await Notification.create({
      user: escrow.farmer._id,
      type: 'payment_released',
      title: 'Payment Released',
      message: `Payment of ${escrow.farmerAmount} RWF for ${escrow.crop?.name || 'order'} has been released to your wallet. Your new balance is ${farmer.walletBalance} RWF.`,
      data: { escrowId: escrow._id },
    });

    // Notify buyer
    await Notification.create({
      user: escrow.buyer._id,
      type: 'system',
      title: 'Payment Released to Farmer',
      message: `The payment of ${escrow.amount} RWF for ${escrow.crop?.name || 'your order'} has been confirmed and released to the farmer.`,
      data: { escrowId: escrow._id },
    });

    // Update delivery pricing status
    if (escrow.delivery) {
      await Delivery.findByIdAndUpdate(escrow.delivery, { priceStatus: 'paid' });
    }

    res.json({ 
      message: 'Payment released to farmer',
      escrow,
      farmerNewBalance: farmer.walletBalance
    });
  } catch (error) {
    console.error('[releaseEscrow] Error:', error);
    next(error);
  }
};

exports.getDeliveries = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const deliveries = await Delivery.find(query)
      .populate('farmer', 'name email phone')
      .populate('buyer', 'name email phone')
      .populate('transporter', 'name email phone')
      .populate('crop', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Delivery.countDocuments(query);
    res.json({ deliveries, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.refundEscrow = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const escrow = await Escrow.findById(req.params.id)
      .populate('crop', 'name')
      .populate('buyer', '_id name phone')
      .populate('farmer', '_id name phone');

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (!['locked', 'in_transit', 'delivered', 'disputed'].includes(escrow.status)) {
      return res.status(400).json({ 
        message: `Cannot refund escrow in status: ${escrow.status}. Only locked, in_transit, delivered, or disputed escrows can be refunded.`
      });
    }

    // Refund money to buyer's wallet
    const buyer = await User.findById(escrow.buyer._id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    const previousBalance = buyer.walletBalance || 0;
    buyer.walletBalance = (buyer.walletBalance || 0) + escrow.amount;
    await buyer.save();

    console.log(`[refundEscrow] Refunded ${escrow.amount} RWF to buyer ${escrow.buyer._id}. Previous: ${previousBalance}, New: ${buyer.walletBalance}`);

    // Update escrow status
    escrow.status = 'refunded';
    escrow.refundReason = reason || 'Admin refund';
    escrow.releasedAt = new Date();
    await escrow.save();

    // Notify buyer
    await Notification.create({
      user: escrow.buyer._id,
      type: 'payment_refunded',
      title: 'Payment Refunded',
      message: `Your payment of ${escrow.amount} RWF for ${escrow.crop?.name || 'order'} has been refunded to your wallet. Reason: ${reason || 'Admin action'}. Your new balance is ${buyer.walletBalance} RWF.`,
      data: { escrowId: escrow._id },
    });

    // Notify farmer
    await Notification.create({
      user: escrow.farmer._id,
      type: 'system',
      title: 'Order Cancelled - Payment Refunded',
      message: `The buyer has cancelled the order for ${escrow.crop?.name || 'your order'}. The payment has been refunded. Reason: ${reason || 'Admin action'}.`,
      data: { escrowId: escrow._id },
    });

    res.json({ 
      message: 'Payment refunded to buyer',
      escrow,
      buyerNewBalance: buyer.walletBalance
    });
  } catch (error) {
    console.error('[refundEscrow] Error:', error);
    next(error);
  }
};

exports.resolveDispute = async (req, res, next) => {
  try {
    const { decision, reason } = req.body; // decision: 'refund_buyer' or 'release_farmer'
    
    if (!['refund_buyer', 'release_farmer'].includes(decision)) {
      return res.status(400).json({ message: 'Invalid decision. Must be refund_buyer or release_farmer' });
    }

    const escrow = await Escrow.findById(req.params.id)
      .populate('crop', 'name')
      .populate('buyer', '_id name phone walletBalance')
      .populate('farmer', '_id name phone walletBalance');

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    if (escrow.status !== 'disputed') {
      return res.status(400).json({ message: 'Only disputed escrows can be resolved' });
    }

    if (decision === 'refund_buyer') {
      // Refund to buyer
      escrow.buyer.walletBalance = (escrow.buyer.walletBalance || 0) + escrow.amount;
      await escrow.buyer.save();

      escrow.status = 'refunded';
      escrow.refundReason = reason || 'Dispute resolved - refund to buyer';
      escrow.releasedAt = new Date();
      await escrow.save();

      console.log(`[resolveDispute] Refunded ${escrow.amount} RWF to buyer ${escrow.buyer._id}`);

      await Notification.create({
        user: escrow.buyer._id,
        type: 'dispute_resolved',
        title: 'Dispute Resolved - Payment Refunded',
        message: `Your dispute for ${escrow.crop?.name || 'order'} has been resolved. Payment of ${escrow.amount} RWF has been refunded to your wallet. Reason: ${reason || 'Resolved in your favor'}. New balance: ${escrow.buyer.walletBalance} RWF.`,
        data: { escrowId: escrow._id },
      });

      await Notification.create({
        user: escrow.farmer._id,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: `The dispute for ${escrow.crop?.name || 'order'} has been resolved in the buyer's favor. Reason: ${reason || 'Resolved'}. The payment has been refunded.`,
        data: { escrowId: escrow._id },
      });

      return res.json({ 
        message: 'Dispute resolved - Payment refunded to buyer',
        escrow,
        buyerNewBalance: escrow.buyer.walletBalance
      });
    }

    if (decision === 'release_farmer') {
      // Release to farmer
      escrow.farmer.walletBalance = (escrow.farmer.walletBalance || 0) + escrow.farmerAmount;
      await escrow.farmer.save();

      escrow.status = 'released';
      escrow.releasedAt = new Date();
      await escrow.save();

      console.log(`[resolveDispute] Released ${escrow.farmerAmount} RWF to farmer ${escrow.farmer._id}`);

      await Notification.create({
        user: escrow.farmer._id,
        type: 'dispute_resolved',
        title: 'Dispute Resolved - Payment Released',
        message: `Your dispute for ${escrow.crop?.name || 'order'} has been resolved. Payment of ${escrow.farmerAmount} RWF has been released to your wallet. Reason: ${reason || 'Resolved in your favor'}. New balance: ${escrow.farmer.walletBalance} RWF.`,
        data: { escrowId: escrow._id },
      });

      await Notification.create({
        user: escrow.buyer._id,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: `Your dispute for ${escrow.crop?.name || 'order'} has been resolved against you. Reason: ${reason || 'Resolved'}. The payment has been released to the farmer.`,
        data: { escrowId: escrow._id },
      });

      return res.json({ 
        message: 'Dispute resolved - Payment released to farmer',
        escrow,
        farmerNewBalance: escrow.farmer.walletBalance
      });
    }
  } catch (error) {
    console.error('[resolveDispute] Error:', error);
    next(error);
  }
};
