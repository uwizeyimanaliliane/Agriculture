const express = require('express');
const router = express.Router();
const {
  register, login, googleAuth, getProfile,
  updateProfile, updateFcmToken, updateLocation,
  changePassword,
} = require('../controllers/authController');
const {
  sendCode, verifyCode, checkStatus,
} = require('../controllers/verificationController');
const {
  forgotPassword, resetPassword, testEmail,
} = require('../controllers/passwordController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/fcm-token', protect, updateFcmToken);
router.put('/location', protect, updateLocation);

router.post('/send-code', sendCode);
router.post('/verify-code', verifyCode);
router.get('/verification-status', protect, checkStatus);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/test-email', testEmail);

module.exports = router;
