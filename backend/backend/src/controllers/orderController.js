const path = require('path');
const Escrow = require('../models/Escrow');
const Crop = require('../models/Crop');
const Farmer = require('../models/Farmer');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const { notifyTransportersNewJob } = require('../services/notificationService');
const { v4: uuidv4 } = require('uuid');

const normalizePhone = (rawPhone) => {
  if (!rawPhone) return '';
  let phone = String(rawPhone).trim();
  phone = phone.replace(/\s+/g, '');
  phone = phone.replace(/[^0-9+]/g, '');
  if (phone.startsWith('+250')) {
    phone = '0' + phone.slice(4);
  }
  if (phone.startsWith('250') && phone.length === 12) {
    phone = '0' + phone.slice(3);
  }
  if (phone.length === 9 && phone.startsWith('7')) {
    phone = '0' + phone;
  }
  return phone;
};

exports.placeOrder = async (req, res, next) => {
  try {
    const { cropId, quantity, pickupLocation, deliveryLocation } = req.body;
    const buyerId = req.user._id;
    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number' });
    }

    const crop = await Crop.findById(cropId)
      .populate('user', '_id name phone location')
      .populate({
        path: 'farmer',
        populate: { path: 'user', select: '_id name phone location' },
      });
    if (!crop) return res.status(404).json({ message: 'Crop not found' });
    if (crop.status === 'sold') return res.status(400).json({ message: 'Crop is already sold' });
    if (qty > crop.quantity) return res.status(400).json({ message: `Only ${crop.quantity} ${crop.quantityUnit} available` });

    let farmerUser = crop.user;
    if ((!farmerUser || !farmerUser._id) && crop.farmer) {
      if (crop.farmer.user && crop.farmer.user._id) {
        farmerUser = crop.farmer.user;
      } else {
        const farmerDoc = await Farmer.findById(crop.farmer).populate('user', '_id name phone location');
        farmerUser = farmerDoc?.user;
      }
    }

    const farmerUserId = farmerUser?._id;
    if (!farmerUserId) {
      return res.status(400).json({ message: 'Crop does not have a valid farmer assigned' });
    }
    const subtotal = crop.price * qty;
    const PLATFORM_FEE = 2500;
    const platformFee = PLATFORM_FEE;
    const transportFee = crop.transportPrice || 0;
    const totalAmount = subtotal + platformFee + transportFee;
    const farmerAmount = subtotal;

    const transactionRef = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;

    const delivery = await Delivery.create({
      crop: crop._id,
      farmer: farmerUserId,
      buyer: buyerId,
      pickupLocation: pickupLocation || crop.location || {},
      deliveryLocation: deliveryLocation || {},
      orderedBy: buyerId,
      requestedBy: 'buyer',
      status: 'pending',
    });

    notifyTransportersNewJob(delivery.toObject(), crop, req.user);

    const escrow = await Escrow.create({
      crop: crop._id,
      buyer: buyerId,
      farmer: farmerUserId,
      amount: totalAmount,
      platformFee,
      farmerAmount,
      type: 'direct',
      status: 'pending_deposit',
      transactionRef,
      delivery: delivery._id,
      orderedBy: buyerId,
      adminNumber: '0781793232',
    });

    crop.status = 'sold';
    await crop.save();

    await Notification.create({
      user: farmerUserId,
      type: 'payment_received',
      title: 'New Order Received',
      message: `${req.user.name} has ordered ${quantity} ${crop.quantityUnit} of ${crop.name} for ${totalAmount} RWF (${farmerAmount} RWF after fees). Awaiting payment confirmation.`,
      data: { escrowId: escrow._id, deliveryId: delivery._id, cropId: crop._id },
    });

    await Notification.create({
      user: buyerId,
      type: 'system',
      title: 'Order Placed',
      message: `Your order for ${crop.name} (${quantity} ${crop.quantityUnit}) has been placed. Please complete payment to lock the order.`,
      data: { escrowId: escrow._id, deliveryId: delivery._id },
    });

    const otherBuyers = await User.find({ role: 'buyer', _id: { $ne: buyerId } }).select('_id');
    if (otherBuyers.length > 0) {
      const buyerNotifications = otherBuyers.map(b => ({
        user: b._id,
        type: 'system',
        title: 'Crop Sold',
        message: `${req.user.name} (${req.user.email}${req.user.phone ? ', ' + req.user.phone : ''}) has purchased ${quantity} ${crop.quantityUnit} of ${crop.name}`,
        data: { cropId: crop._id },
      }));
      await Notification.insertMany(buyerNotifications);
    }

    res.status(201).json({ escrow, delivery, message: 'Order placed. Complete payment to lock the order.' });
  } catch (error) {
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const escrows = await Escrow.find({
      $or: [{ buyer: req.user._id }, { farmer: req.user._id }],
      type: 'direct',
    })
      .populate('buyer', 'name phone email location')
      .populate('farmer', 'name phone email location')
      .populate('crop', 'name quantity quantityUnit price photos location')
      .populate('delivery')
      .populate('transporter', 'name phone')
      .sort({ createdAt: -1 });

    const toPhotoUrl = (filePath) => {
      if (!filePath) return null;
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
      return `/uploads/${path.basename(filePath)}`;
    };
    const orders = escrows.map(e => {
      const obj = e.toObject();
      if (obj.crop?.photos) {
        obj.crop.photos = obj.crop.photos.map(p => toPhotoUrl(p)).filter(Boolean);
      }
      return obj;
    });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

exports.confirmReceipt = async (req, res, next) => {
  try {
    const escrow = await Escrow.findById(req.params.id).populate('crop');
    if (!escrow) return res.status(404).json({ message: 'Order not found' });
    if (escrow.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the buyer can confirm receipt' });
    }
    if (escrow.status !== 'locked' && escrow.status !== 'in_transit') {
      return res.status(400).json({ message: 'Order cannot be confirmed in current status' });
    }

    escrow.status = 'delivered';
    escrow.confirmedAt = new Date();
    await escrow.save();

    if (escrow.delivery) {
      await Delivery.findByIdAndUpdate(escrow.delivery, { status: 'confirmed', qrScannedByBuyer: true });
    }

    await Notification.create({
      user: escrow.farmer,
      type: 'delivery_confirmed',
      title: 'Order Confirmed - Payment Pending Release',
      message: `${req.user.name} has confirmed receipt of ${escrow.crop?.name || 'the order'}. Admin will now review and release your payment.`,
      data: { escrowId: escrow._id },
    });

    await Notification.create({
      user: escrow.buyer,
      type: 'system',
      title: 'Receipt Confirmed',
      message: 'Thank you! Your receipt has been confirmed. The admin will release payment to the farmer after review.',
      data: { escrowId: escrow._id },
    });

    res.json({ escrow, message: 'Receipt confirmed. Payment will be released after admin review.' });
  } catch (error) {
    next(error);
  }
};

exports.mobilePay = async (req, res, next) => {
  try {
    const { phone, network } = req.body;
    const escrowId = req.params.id;
    
    console.log(`[mobilePay] Request for escrow ${escrowId} with phone: ${phone}, network: ${network}`);

    const escrow = await Escrow.findById(escrowId)
      .populate('crop', 'name')
      .populate('buyer', 'name phone walletBalance');
    
    if (!escrow) {
      console.log(`[mobilePay] Escrow ${escrowId} not found`);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log(`[mobilePay] Escrow status: ${escrow.status}, buyer: ${escrow.buyer._id}`);

    if (escrow.buyer._id.toString() !== req.user._id.toString()) {
      console.log(`[mobilePay] Unauthorized - buyer ${escrow.buyer._id} vs user ${req.user._id}`);
      return res.status(403).json({ message: 'Only the buyer can make payment' });
    }

    if (escrow.status !== 'pending_deposit') {
      console.log(`[mobilePay] Invalid status for payment: ${escrow.status}`);
      return res.status(400).json({ message: 'Payment already completed for this order' });
    }

    // Validate phone and network
    const phoneStr = normalizePhone(phone);
    const networkStr = String(network || '').trim().toLowerCase();

    if (!phoneStr) {
      console.log(`[mobilePay] Phone number is missing`);
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!networkStr) {
      console.log(`[mobilePay] Network is missing`);
      return res.status(400).json({ message: 'Network is required' });
    }

    if (!/^0[78][0-9]{7,8}$/.test(phoneStr)) {
      console.log(`[mobilePay] Invalid phone format: ${phoneStr}`);
      return res.status(400).json({ message: 'Phone number must be a valid Rwandan number, e.g. 0727XXXXXX or 0781XXXXXX' });
    }

    if (!['mtn', 'airtel'].includes(networkStr)) {
      console.log(`[mobilePay] Invalid network: ${networkStr}`);
      return res.status(400).json({ message: 'Invalid network. Must be mtn or airtel' });
    }

    // Simulate USSD push to the user's phone
    // In production, this would trigger an actual MTN/Airtel payment request and PIN prompt.
    const MobileAccount = require('../models/MobileAccount');

    let mobileAccount = await MobileAccount.findOne({ phone: phoneStr, network: networkStr });
    if (!mobileAccount) {
      console.log(`[mobilePay] No existing account for ${phoneStr} @ ${networkStr}. Creating demo account with 500,000 RWF.`);
      mobileAccount = await MobileAccount.create({
        phone: phoneStr,
        network: networkStr,
        balance: 500000,
        pin: '0000',
      });
    }

    if ((mobileAccount.balance || 0) < escrow.amount) {
      console.log(`[mobilePay] Insufficient mobile balance: ${mobileAccount.balance} < ${escrow.amount}`);
      return res.status(400).json({ message: `Insufficient balance on your mobile money account. You need ${escrow.amount} RWF but only have ${mobileAccount.balance} RWF.` });
    }

    // Mark escrow as pending verification - USSD push has been sent
    escrow.paymentMethod = 'mobile_money';
    escrow.payerPhone = phoneStr;
    escrow.network = networkStr;
    escrow.status = 'payment_pending_verification';
    escrow.paymentInitiatedAt = new Date();
    await escrow.save();

    // Simulate sending a payment request to the user's phone number (SMS/USSD)
    console.log(`\n[mobilePay] 📱 PAYMENT REQUEST SENT TO ${phoneStr} (${networkStr.toUpperCase()})`);
    console.log(`   ┌─────────────────────────────────────────────────────────────`);
    console.log(`   │ Amount:  ${escrow.amount} RWF`);
    console.log(`   │ To:      ${phoneStr} (${networkStr.toUpperCase()} Mobile Money)`);
    console.log(`   │ From:    Agri-Link Rwanda`);
    console.log(`   │ Ref:     ${escrow.transactionRef}`);
    console.log(`   │ Message: "Payment request of ${escrow.amount} RWF to Agri-Link."`);
    console.log(`   └─────────────────────────────────────────────────────────────`);
    console.log(`[mobilePay] ✅ USSD/SMS delivered. Awaiting PIN entry on phone...\n`);

    // Simulate provider callback after ~5 seconds (fast USSD flow)
    setTimeout(async () => {
      try {
        const updatedEscrow = await Escrow.findById(escrow._id);
        if (updatedEscrow && updatedEscrow.status === 'payment_pending_verification') {
          // Deduct from the user's mobile account (simulating real deduction)
          const account = await MobileAccount.findOne({ phone: phoneStr, network: networkStr });
          if (account) {
            account.balance = (account.balance || 0) - escrow.amount;
            await account.save();
            console.log(`[mobilePay] ✅ ${escrow.amount} RWF DEDUCTED from ${phoneStr} (${networkStr.toUpperCase()}). New balance: ${account.balance} RWF`);
          }

          updatedEscrow.status = 'locked';
          updatedEscrow.paidAt = new Date();
          await updatedEscrow.save();

          console.log(`[mobilePay] ✅ Escrow ${escrow._id} LOCKED. Payment complete.`);

          await Notification.create({
            user: updatedEscrow.farmer,
            type: 'payment_received',
            title: 'Payment Confirmed via Mobile Money',
            message: `Payment of ${updatedEscrow.amount} RWF for ${updatedEscrow.crop?.name || 'order'} has been received via ${networkStr === 'mtn' ? 'MTN' : 'Airtel'} Mobile Money (${phoneStr}). Order is now locked.`,
            data: { escrowId: updatedEscrow._id },
          });

          await Notification.create({
            user: updatedEscrow.buyer,
            type: 'system',
            title: 'Payment Successful',
            message: `Your payment of ${updatedEscrow.amount} RWF via ${networkStr === 'mtn' ? 'MTN' : 'Airtel'} Mobile Money (${phoneStr}) has been processed. ${updatedEscrow.amount} RWF has been deducted from your mobile money account and locked in escrow.`,
            data: { escrowId: updatedEscrow._id },
          });

          const adminUsers = await User.find({ role: 'admin' });
          if (adminUsers.length > 0) {
            const adminNotifications = adminUsers.map((a) => ({
              user: a._id,
              type: 'payment_received_admin',
              title: 'Buyer Payment Received & Locked',
              message: `Payment of ${updatedEscrow.amount} RWF received from ${escrow.buyer?.name || 'Unknown'} (${phoneStr}) via ${networkStr === 'mtn' ? 'MTN' : 'Airtel'} for order ${updatedEscrow.transactionRef}.`,
              data: { escrowId: updatedEscrow._id },
            }));
            await Notification.insertMany(adminNotifications);
          }
        }
      } catch (err) {
        console.error('[mobilePay] Error processing payment confirmation:', err);
      }
    }, 5000);

    res.json({
      escrow,
      message: `A payment request has been sent to ${phoneStr} via ${networkStr.toUpperCase()} Mobile Money. Check your phone and enter your PIN to authorize ${escrow.amount} RWF. This takes about 5 seconds.`,
    });
  } catch (error) {
    console.error('[mobilePay] Unexpected error:', error);
    next(error);
  }
};

exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const escrow = await Escrow.findById(req.params.id);
    if (!escrow) return res.status(404).json({ message: 'Order not found' });
    if (escrow.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the buyer can check payment status' });
    }

    const statuses = {
      pending_deposit: { status: 'pending', message: 'Awaiting payment' },
      payment_pending_verification: { 
        status: 'processing', 
        message: 'Payment is being verified with mobile money provider (10-30 seconds)',
        verifyingPhone: escrow.payerPhone,
        verifyingNetwork: escrow.network 
      },
      locked: { 
        status: 'completed', 
        message: 'Payment verified and order locked',
        paidAt: escrow.paidAt,
        network: escrow.network,
        phone: escrow.payerPhone
      },
      dispute_raised: { status: 'dispute', message: 'Dispute has been raised' },
      released: { status: 'released', message: 'Payment released to farmer' },
      refunded: { status: 'refunded', message: 'Payment refunded' },
    };

    const statusInfo = statuses[escrow.status] || { status: 'unknown', message: 'Unknown status' };
    res.json({
      escrow: {
        _id: escrow._id,
        transactionRef: escrow.transactionRef,
        amount: escrow.amount,
        status: escrow.status,
        paymentMethod: escrow.paymentMethod,
        paymentInitiatedAt: escrow.paymentInitiatedAt,
        paidAt: escrow.paidAt,
      },
      ...statusInfo,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTransporters = async (req, res, next) => {
  try {
    const { lat, lng, maxDistance, address } = req.query;

    const query = { role: 'transporter', isVerified: true };
    if (address) {
      const regex = new RegExp(address.trim(), 'i');
      query.$or = [
        { 'location.province': regex },
        { 'location.district': regex },
        { 'location.sector': regex },
        { 'location.village': regex },
        { name: regex },
      ];
    }

    let transporters;
    if (lat && lng) {
      transporters = await User.find({
        ...query,
        'location.coordinates': { $exists: true, $ne: [0, 0] },
      }).select('name phone email location isVerified');

      transporters = transporters
        .map((t) => {
          const transporter = t.toObject();
          const [tLng, tLat] = transporter.location?.coordinates || [0, 0];
          transporter.distance = getDistance(lat, lng, tLat, tLng);
          transporter.distance = transporter.distance ? Math.round(transporter.distance * 10) / 10 : null;
          return transporter;
        })
        .filter((t) => !maxDistance || (t.distance !== null && t.distance <= parseFloat(maxDistance)))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      transporters = await User.find(query).select('name phone email location isVerified');
      transporters = transporters.map((t) => {
        const transporter = t.toObject ? t.toObject() : t;
        transporter.distance = null;
        return transporter;
      });
    }

    transporters = transporters.map((t) => {
      const addressParts = [
        t.location?.village,
        t.location?.sector,
        t.location?.district,
        t.location?.province,
      ].filter(Boolean);
      return {
        ...t,
        address: addressParts.length ? addressParts.join(', ') : 'Address not available',
      };
    });

    res.json({ transporters });
  } catch (error) {
    next(error);
  }
};

exports.getEscrow = async (req, res, next) => {
  try {
    const { lat, lng, maxDistance } = req.query;

    let query = { role: 'transporter', isVerified: true };

    let transporters;
    if (lat && lng) {
      transporters = await User.find({
        ...query,
        'location.coordinates': { $exists: true, $ne: [0, 0] },
      }).select('name phone location');

      transporters = transporters
        .map(t => {
          const [tLng, tLat] = t.location?.coordinates || [0, 0];
          const dist = getDistance(lat, lng, tLat, tLng);
          return { ...t.toObject(), distance: Math.round(dist * 10) / 10 };
        })
        .filter(t => !maxDistance || t.distance <= parseFloat(maxDistance))
        .sort((a, b) => a.distance - b.distance);
    } else {
      transporters = await User.find(query).select('name phone location');
      transporters = transporters.map(t => ({ ...t.toObject(), distance: null }));
    }

    res.json({ transporters });
  } catch (error) {
    next(error);
  }
};

exports.orderTransporter = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign transporters.' });
    }

    const { deliveryId, transporterId } = req.body;
    const userId = req.user._id;

    const delivery = await Delivery.findById(deliveryId).populate('farmer', 'name phone location').populate('buyer', 'name phone location').populate('crop', 'name');
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    const transporter = await User.findById(transporterId);
    if (!transporter || transporter.role !== 'transporter') {
      return res.status(400).json({ message: 'Invalid transporter' });
    }

    delivery.transporter = transporter._id;
    delivery.transporterPrice = null;
    delivery.priceStatus = 'pending';
    await delivery.save();

    const orderedByUser = await User.findById(userId).select('name phone location');

    const isFarmerOrdering = userId.toString() === delivery.farmer._id.toString();
    const counterParty = isFarmerOrdering ? delivery.buyer : delivery.farmer;

    let etaMessage = '';
    if (orderedByUser.location?.coordinates && transporter.location?.coordinates) {
      const dist = getDistance(
        orderedByUser.location.coordinates[1],
        orderedByUser.location.coordinates[0],
        transporter.location.coordinates[1],
        transporter.location.coordinates[0]
      );
      const estimatedMinutes = Math.round((dist / 40) * 60);
      etaMessage = ` Estimated arrival: ~${estimatedMinutes} minutes.`;
    }

    await Notification.create({
      user: transporter._id,
      type: 'delivery_assigned',
      title: 'Delivery Request',
      message: `${orderedByUser.name} needs a delivery for ${delivery.crop?.name || 'crops'}. Set your price to accept.${etaMessage}`,
      data: { deliveryId: delivery._id },
    });

    if (counterParty) {
      await Notification.create({
        user: counterParty._id,
        type: 'transporter_assigned',
        title: 'Transporter Assigned',
        message: `A transporter has been assigned for your delivery.`,
        data: { deliveryId: delivery._id },
      });
    }

    res.json({ delivery, message: `Transporter notified${etaMessage}` });
  } catch (error) {
    next(error);
  }
};

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Functions already exported via exports.xxx = ... above
