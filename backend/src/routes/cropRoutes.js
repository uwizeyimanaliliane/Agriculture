const express = require('express');
const router = express.Router();
const {
  addCrop, getMyCrops, getCropById,
  getAvailableCrops, updateCrop, deleteCrop,
  getPendingCrops, approveCrop, rejectCrop,
  submitTransportBid, getTransportBids, acceptTransportBid, getNeedingTransport,
} = require('../controllers/cropController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/available', getAvailableCrops);
router.get('/needing-transport', protect, authorize('admin', 'transporter'), getNeedingTransport);
router.get('/pending', protect, authorize('admin'), getPendingCrops);
router.get('/mine', protect, authorize('farmer'), getMyCrops);
router.get('/:id', getCropById);
router.post('/', protect, authorize('farmer'), upload.array('photos', 5), addCrop);
router.put('/:id/approve', protect, authorize('admin'), approveCrop);
router.put('/:id/reject', protect, authorize('admin'), rejectCrop);
router.post('/:id/transport-bid', protect, authorize('transporter'), submitTransportBid);
router.get('/:id/transport-bids', protect, authorize('admin'), getTransportBids);
router.put('/:id/accept-bid/:bidId', protect, authorize('admin'), acceptTransportBid);
router.put('/:id', protect, authorize('farmer'), upload.array('photos', 5), updateCrop);
router.delete('/:id', protect, authorize('farmer'), deleteCrop);

module.exports = router;
