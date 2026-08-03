const express = require('express');
const router = express.Router();
const {
  getFarmerProfile, updateFarmDetails, submitVerificationRequest,
  getVerificationStatus, submitInspectionReport, getRecentActivity, getFarmers,
} = require('../controllers/farmerController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getFarmers);
router.get('/profile/:id?', protect, getFarmerProfile);
router.get('/recent-activity', protect, authorize('farmer'), getRecentActivity);
router.put('/farm-details', protect, authorize('farmer'), updateFarmDetails);
router.post('/verification-request', protect, authorize('farmer'), submitVerificationRequest);
router.get('/verification-status', protect, authorize('farmer'), getVerificationStatus);
router.post('/inspection-report', protect, authorize('agent'), upload.array('photos', 10), submitInspectionReport);

module.exports = router;
