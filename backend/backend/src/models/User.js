const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    minlength: 6,
    select: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['farmer', 'buyer', 'transporter', 'agent', 'cooperative', 'admin'],
    required: true,
  },
  googleId: String,
  avatar: String,
  fcmToken: String,
  isVerified: {
    type: Boolean,
    default: false,
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    province: String,
    district: String,
    sector: String,
    village: String,
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'rw', 'fr'],
    default: 'en',
  },
  darkMode: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
