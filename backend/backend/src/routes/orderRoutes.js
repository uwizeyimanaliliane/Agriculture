const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  placeOrder, getMyOrders, confirmReceipt, getTransporters, orderTransporter, mobilePay, checkPaymentStatus,
} = require('../controllers/orderController');

router.post('/', protect, placeOrder);
router.get('/mine', protect, getMyOrders);
router.put('/:id/confirm', protect, confirmReceipt);
router.put('/:id/mobile-pay', protect, mobilePay);
router.get('/:id/payment-status', protect, checkPaymentStatus);
router.get('/transporters', protect, getTransporters);
router.post('/order-transporter', protect, authorize('admin'), orderTransporter);

module.exports = router;
