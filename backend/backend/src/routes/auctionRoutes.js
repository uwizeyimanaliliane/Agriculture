const express = require('express');
const router = express.Router();
const {
  createAuction, getActiveAuctions, getAuctionById,
  placeBid, closeAuction, getMyAuctions, getMyBids,
} = require('../controllers/auctionController');
const { protect, authorize } = require('../middleware/auth');

router.get('/active', getActiveAuctions);
router.get('/mine', protect, getMyAuctions);
router.get('/my-bids', protect, getMyBids);
router.get('/:id', getAuctionById);
router.post('/', protect, authorize('farmer'), createAuction);
router.post('/:id/bid', protect, authorize('buyer'), placeBid);
router.put('/:id/close', protect, authorize('farmer'), closeAuction);

module.exports = router;
