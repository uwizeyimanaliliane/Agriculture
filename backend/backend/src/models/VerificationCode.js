const mongoose = require('mongoose');
const crypto = require('crypto');

const verificationCodeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  codeHash: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['email_verification', 'password_reset', 'email_change'],
    default: 'email_verification',
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 5,
  },
  usedAt: Date,
}, { timestamps: true });

verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationCodeSchema.index({ user: 1, purpose: 1 });

verificationCodeSchema.statics.generateCode = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

verificationCodeSchema.statics.hashCode = function (code) {
  return crypto.createHash('sha256').update(code).digest('hex');
};

verificationCodeSchema.statics.cleanupExpired = async function () {
  await this.deleteMany({ expiresAt: { $lt: new Date() } });
};

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
