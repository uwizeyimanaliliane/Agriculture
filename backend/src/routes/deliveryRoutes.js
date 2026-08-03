const express = require('express');
const router = express.Router();
const {
  createDelivery, assignTransporter, updateDeliveryStatus,
  confirmDeliveryByQR, getDeliveryById, getAvailableDeliveries, getMyDeliveries,
  setTransporterPrice, acceptTransporterPrice,
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/auth');

router.get('/available', protect, authorize('transporter'), getAvailableDeliveries);
router.get('/mine', protect, getMyDeliveries);
router.get('/:id', protect, getDeliveryById);
router.get('/:id/route', protect, authorize('transporter'), require('../controllers/deliveryController').getDeliveryRoute);
router.post('/', protect, authorize('farmer', 'buyer'), createDelivery);
router.put('/:id/assign', protect, authorize('transporter'), assignTransporter);
router.put('/:id/status', protect, authorize('transporter'), updateDeliveryStatus);
router.put('/:id/confirm-qr', protect, authorize('buyer'), confirmDeliveryByQR);
router.put('/:id/set-price', protect, authorize('transporter'), setTransporterPrice);
router.put('/:id/accept-price', protect, authorize('farmer', 'buyer'), acceptTransporterPrice);

module.exports = router;
