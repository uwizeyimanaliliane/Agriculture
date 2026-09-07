const mongoose = require('mongoose');
const User = require('./User');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'new_bid', 'outbid', 'auction_won', 'auction_closed',
      'delivery_update', 'delivery_assigned', 'delivery_confirmed',
      'escrow_deposited', 'escrow_released', 'payment_received',
      'verification_update', 'verification_approved', 'verification_rejected',
      'subscription_reminder', 'new_message', 'system',
      'price_quote', 'price_accepted',
      'payment_received_admin', 'crop_sold', 'transporter_assigned',
      'new_crop_available', 'new_transport_job', 'buyer_interested', 'transport_price_quoted', 'transport_price_accepted',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  isAdminCopy: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });

notificationSchema.post('save', async function (doc) {
  if (doc.isAdminCopy) return;
  try {
    const admins = await User.find({ role: 'admin', _id: { $ne: doc.user } });
    if (admins.length === 0) return;
    const copies = admins.map(a => ({
      user: a._id,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      data: doc.data,
      isAdminCopy: true,
    }));
    await mongoose.model('Notification').insertMany(copies);
  } catch (err) {
    console.warn('Failed to notify admins:', err.message);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
