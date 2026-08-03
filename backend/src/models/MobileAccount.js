const mongoose = require('mongoose');

const mobileAccountSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  network: { type: String, enum: ['mtn', 'airtel'], required: true },
  balance: { type: Number, default: 0 },
  pin: { type: String, default: null },
}, { timestamps: true });

mobileAccountSchema.index({ phone: 1, network: 1 }, { unique: true });

module.exports = mongoose.model('MobileAccount', mobileAccountSchema);
