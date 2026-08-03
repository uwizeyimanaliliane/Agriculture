const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  crop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true,
  },
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
  startingPrice: {
    type: Number,
    required: true,
  },
  currentHighestBid: {
    type: Number,
    default: 0,
  },
  highestBidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  minimumIncrement: {
    type: Number,
    default: 5000,
  },
  reservePrice: Number,
  status: {
    type: String,
    enum: ['active', 'closed', 'cancelled', 'completed'],
    default: 'active',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  bids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
  }],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  winningBid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
  },
}, { timestamps: true });

module.exports = mongoose.model('Auction', auctionSchema);
