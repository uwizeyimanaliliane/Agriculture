const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  escrow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow',
  },
  crop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true,
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  transporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  pickupLocation: {
    province: String,
    district: String,
    sector: String,
    coordinates: { type: [Number], default: [0, 0] },
  },
  deliveryLocation: {
    province: String,
    district: String,
    sector: String,
    coordinates: { type: [Number], default: [0, 0] },
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed', 'cancelled'],
    default: 'pending',
  },
  qrCode: String,
  qrCodeData: String,
  qrScannedByBuyer: {
    type: Boolean,
    default: false,
  },
  loadShare: {
    isGrouped: { type: Boolean, default: false },
    groupId: String,
    otherFarmers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  tracking: {
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    lastUpdated: Date,
  },
  pickupDate: Date,
  deliveryDate: Date,
  deliveryNotes: String,
  requestedBy: {
    type: String,
    enum: ['farmer', 'buyer'],
    default: 'farmer',
  },
  transporterPrice: {
    type: Number,
  },
  priceStatus: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'paid'],
    default: 'pending',
  },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

deliverySchema.index({ 'tracking.currentLocation': '2dsphere' });

module.exports = mongoose.model('Delivery', deliverySchema);
