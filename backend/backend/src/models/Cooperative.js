const mongoose = require('mongoose');

const cooperativeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  location: {
    province: String,
    district: String,
    sector: String,
  },
  contact: {
    phone: String,
    email: String,
  },
  description: String,
  isVerified: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Cooperative', cooperativeSchema);
