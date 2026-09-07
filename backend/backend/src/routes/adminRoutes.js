const express = require('express');
const router = express.Router();
const {
  getUsers, getUserById, updateUserRole, toggleUserStatus, deleteUser,
  getDashboardStats, getCrops, getEscrows, releaseEscrow, getDeliveries,
  refundEscrow, resolveDispute, updateUserProfile, adminChangePassword,
} = require('../controllers/adminController');
const { orderTransporter, getTransporters } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/crops', getCrops);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.put('/users/:id/profile', upload.single('avatar'), updateUserProfile);
router.put('/users/:id/password', adminChangePassword);
router.delete('/users/:id', deleteUser);
router.get('/escrows', getEscrows);
router.put('/escrows/:id/release', releaseEscrow);
router.put('/escrows/:id/refund', refundEscrow);
router.put('/escrows/:id/resolve-dispute', resolveDispute);
router.get('/deliveries', getDeliveries);
router.get('/transporters', getTransporters);
router.post('/assign-transporter', orderTransporter);

module.exports = router;
