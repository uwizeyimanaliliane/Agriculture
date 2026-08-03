const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['vegetables', 'fruits', 'grains', 'tubers', 'legumes', 'other'],
    required: true,
  },
  description: String,
  quantity: {
    type: Number,
    required: true,
  },
  quantityUnit: {
    type: String,
    enum: ['kg', 'ton', 'sack', 'crate', 'bunch', 'piece'],
    required: true,
  },
  price: {
    type: Number,
  },
  priceUnit: {
    type: String,
    enum: ['per_kg', 'per_ton', 'per_sack', 'per_crate', 'per_bunch', 'per_piece'],
  },
  photos: [String],
  transportPrice: {
    type: Number,
    default: 0,
  },
  transportBids: [{
    transporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    price: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
  }],
  rejectReason: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending_admin', 'approved', 'available', 'in_auction', 'sold', 'harvested', 'delivered', 'rejected'],
    default: 'pending_admin',
  },
  isPreHarvest: {
    type: Boolean,
    default: false,
  },
  estimatedHarvestDate: Date,
  location: {
    province: String,
    district: String,
    sector: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Crop', cropSchema);
