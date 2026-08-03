const Escrow = require('../models/Escrow');
const { v4: uuidv4 } = require('uuid');

const createEscrow = async ({ auction, crop, buyer, farmer, amount }) => {
  const escrow = await Escrow.create({
    auction,
    crop,
    buyer,
    farmer,
    amount,
    status: 'pending_deposit',
    transactionRef: `ESC-${uuidv4().slice(0, 8).toUpperCase()}`,
  });
  return escrow;
};

const confirmDeposit = async (escrowId) => {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  escrow.status = 'locked';
  escrow.paidAt = new Date();
  await escrow.save();
  return escrow;
};

const releasePayment = async (escrowId) => {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');
  if (escrow.status !== 'delivered') throw new Error('Delivery not confirmed');

  escrow.status = 'released';
  escrow.releasedAt = new Date();
  await escrow.save();
  return escrow;
};

const disputeEscrow = async (escrowId) => {
  const escrow = await Escrow.findById(escrowId);
  if (!escrow) throw new Error('Escrow not found');

  escrow.status = 'disputed';
  await escrow.save();
  return escrow;
};

module.exports = {
  createEscrow,
  confirmDeposit,
  releasePayment,
  disputeEscrow,
};
