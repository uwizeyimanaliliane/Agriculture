const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  cooperative: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cooperative',
  },
  trustScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  verifiedBadge: {
    type: Boolean,
    default: false,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'in_review', 'verified', 'rejected'],
    default: 'pending',
  },
  verificationDetails: {
    cooperativeApproved: { type: Boolean, default: false },
    farmInspected: { type: Boolean, default: false },
    landVerified: { type: Boolean, default: false },
    photosSubmitted: { type: Boolean, default: false },
  },
  inspectionReports: [{
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportDate: Date,
    findings: String,
    status: { type: String, enum: ['pass', 'fail', 'pending'] },
    photos: [String],
  }],
  farmDetails: {
    farmName: String,
    farmSize: Number,
    farmSizeUnit: { type: String, enum: ['hectare', 'acre'], default: 'hectare' },
    cropsGrown: [String],
    description: String,
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  successfulDeliveries: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
}, { timestamps: true });

module.exports = mongoose.model('Farmer', farmerSchema);
