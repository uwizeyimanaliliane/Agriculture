const { getMessaging } = require('../config/firebase');
const Notification = require('../models/Notification');

const sendNotification = async ({ userId, type, title, message, data }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
    });

    const User = require('../models/User');
    const user = await User.findById(userId);

    if (user && user.fcmToken) {
      await getMessaging().send({
        token: user.fcmToken,
        notification: { title, body: message },
        data: data ? { ...data, type } : { type },
      });
    }

    return notification;
  } catch (error) {
    console.error('Notification error:', error);
  }
};

const notifyNewBid = async (farmerId, auctionId, amount) =>
  sendNotification({
    userId: farmerId,
    type: 'new_bid',
    title: 'New Bid Received',
    message: `A new bid of ${amount.toLocaleString()} RWF has been placed on your auction`,
    data: { auctionId, amount: amount.toString() },
  });

const notifyOutbid = async (userId, auctionId, amount) =>
  sendNotification({
    userId,
    type: 'outbid',
    title: 'You\'ve Been Outbid',
    message: `Someone placed a higher bid of ${amount.toLocaleString()} RWF`,
    data: { auctionId, amount: amount.toString() },
  });

const notifyAuctionWon = async (userId, auctionId, amount) =>
  sendNotification({
    userId,
    type: 'auction_won',
    title: 'Auction Won!',
    message: `Congratulations! You won the auction with ${amount.toLocaleString()} RWF`,
    data: { auctionId, amount: amount.toString() },
  });

const notifyDeliveryUpdate = async (userId, deliveryId, status) =>
  sendNotification({
    userId,
    type: 'delivery_update',
    title: 'Delivery Update',
    message: `Your delivery status has been updated to: ${status}`,
    data: { deliveryId, status },
  });

const notifyPaymentReceived = async (userId, amount) =>
  sendNotification({
    userId,
    type: 'payment_received',
    title: 'Payment Received',
    message: `Payment of ${amount.toLocaleString()} RWF has been released to your account`,
    data: { amount: amount.toString() },
  });

const notifyVerificationUpdate = async (userId, status) =>
  sendNotification({
    userId,
    type: 'verification_update',
    title: 'Verification Update',
    message: `Your verification status has been updated to: ${status}`,
    data: { status },
  });

const notifyBuyersNewCrop = async (crop, farmerUser) => {
  try {
    const User = require('../models/User');
    const buyers = await User.find({ role: 'buyer' }).select('_id').lean();
    if (buyers.length === 0) return;

    const notifications = buyers.map(b => ({
      user: b._id,
      type: 'new_crop_available',
      title: `New ${crop.category}: ${crop.name}`,
      message: `${farmerUser.name} listed ${crop.quantity} ${crop.quantityUnit} of ${crop.name} at ${crop.price ? `${crop.price.toLocaleString()} RWF/${crop.priceUnit}` : 'market price'}. Location: ${crop.location?.district || crop.location?.province || 'Rwanda'}`,
      data: { cropId: crop._id },
    }));
    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('notifyBuyersNewCrop error:', error);
  }
};

const notifyTransportersNewJob = async (delivery, crop, orderedByUser) => {
  try {
    const User = require('../models/User');
    const transporters = await User.find({ role: 'transporter' }).select('_id').lean();
    if (transporters.length === 0) return;

    const pickup = delivery.pickupLocation;
    const dropoff = delivery.deliveryLocation;
    const locationStr = [pickup?.district, pickup?.province].filter(Boolean).join(', ') || 'Rwanda';

    const notifications = transporters.map(t => ({
      user: t._id,
      type: 'new_transport_job',
      title: `Transport Needed: ${crop?.name || 'Crops'}`,
      message: `${orderedByUser.name} needs transport for ${crop?.name || 'crops'} pickup from ${locationStr}. Set your price to accept the job.`,
      data: { deliveryId: delivery._id, cropId: crop?._id },
    }));
    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('notifyTransportersNewJob error:', error);
  }
};

const notifyFarmerBuyerInterested = async (farmerId, buyer, crop, message) => {
  await sendNotification({
    userId: farmerId,
    type: 'buyer_interested',
    title: `${buyer.name} is Interested`,
    message: message || `${buyer.name} is interested in your ${crop?.name || 'crop'}. Contact them to close the deal.`,
    data: { buyerId: buyer._id, cropId: crop?._id },
  });
};

const notifyTransporterPriceQuoted = async (delivery, transporter, price) => {
  try {
    const User = require('../models/User');
    const Crop = require('../models/Crop');
    const crop = delivery.crop ? await Crop.findById(delivery.crop).select('name').lean() : null;

    const parties = await User.find({
      _id: { $in: [delivery.farmer, delivery.buyer].filter(Boolean) },
    }).select('_id').lean();

    const notifications = parties.map(u => ({
      user: u._id,
      type: 'transport_price_quoted',
      title: 'Transport Price Quoted',
      message: `${transporter.name} quoted ${price.toLocaleString()} RWF for delivery of ${crop?.name || 'crops'}. Review and accept the price.`,
      data: { deliveryId: delivery._id, transporterId: transporter._id, price: price.toString() },
    }));
    if (notifications.length > 0) await Notification.insertMany(notifications);
  } catch (error) {
    console.error('notifyTransporterPriceQuoted error:', error);
  }
};

module.exports = {
  sendNotification,
  notifyNewBid,
  notifyOutbid,
  notifyAuctionWon,
  notifyDeliveryUpdate,
  notifyPaymentReceived,
  notifyVerificationUpdate,
  notifyBuyersNewCrop,
  notifyTransportersNewJob,
  notifyFarmerBuyerInterested,
  notifyTransporterPriceQuoted,
};
