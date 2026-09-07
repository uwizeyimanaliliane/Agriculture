const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema({
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
  },
  crop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true,
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['auction', 'direct'],
    default: 'direct',
  },
  status: {
    type: String,
    enum: ['pending_deposit', 'payment_pending_verification', 'locked', 'in_transit', 'delivered', 'released', 'disputed', 'refunded'],
    default: 'pending_deposit',
  },
  transactionRef: {
    type: String,
    unique: true,
  },
  paymentInitiatedAt: Date,
  confirmedAt: Date,
  releasedAt: Date,
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
  },
  transporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  paymentMethod: {
    type: String,
    enum: ['mobile_money', 'bank_transfer', 'card', null],
  },
  payerPhone: String,
  network: {
    type: String,
    enum: ['mtn', 'airtel', null],
  },
  paidAt: Date,
  adminNumber: {
    type: String,
    default: '0781793232',
  },
  platformFee: {
    type: Number,
    default: 0,
  },
  farmerAmount: {
    type: Number,
    default: 0,
  },
  logisticsFee: {
    type: Number,
    default: 0,
  },
  logisticsFeeRate: {
    type: Number,
    default: 0.10,
  },
  refundReason: {
    type: String,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Escrow', escrowSchema);
