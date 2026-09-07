const express = require('express');
const router = express.Router();
const {
  getEscrowDetails, makeDeposit, getMyEscrows, raiseDispute,
} = require('../controllers/escrowController');
const { protect } = require('../middleware/auth');

router.get('/mine', protect, getMyEscrows);
router.get('/:id', protect, getEscrowDetails);
router.put('/:id/deposit', protect, makeDeposit);
router.put('/:id/dispute', protect, raiseDispute);

module.exports = router;
