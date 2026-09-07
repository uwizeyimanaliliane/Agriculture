const Escrow = require('../models/Escrow');
const { confirmDeposit, disputeEscrow } = require('../services/escrowService');

exports.getEscrowDetails = async (req, res, next) => {
  try {
    const escrow = await Escrow.findById(req.params.id)
      .populate('buyer', 'name email')
      .populate('farmer', 'name email')
      .populate('auction')
      .populate('crop', 'name quantity quantityUnit')
      .populate('delivery');

    if (!escrow) {
      return res.status(404).json({ message: 'Escrow not found' });
    }

    res.json({ escrow });
  } catch (error) {
    next(error);
  }
};

exports.makeDeposit = async (req, res, next) => {
  try {
    const escrow = await confirmDeposit(req.params.id);
    res.json({ escrow, message: 'Payment deposited into escrow' });
  } catch (error) {
    next(error);
  }
};

exports.getMyEscrows = async (req, res, next) => {
  try {
    const escrows = await Escrow.find({
      $or: [
        { buyer: req.user._id },
        { farmer: req.user._id },
      ],
    })
      .populate('buyer', 'name')
      .populate('farmer', 'name')
      .populate('crop', 'name quantity quantityUnit')
      .sort({ createdAt: -1 });

    res.json({ escrows });
  } catch (error) {
    next(error);
  }
};

exports.raiseDispute = async (req, res, next) => {
  try {
    const escrow = await disputeEscrow(req.params.id);
    res.json({ escrow, message: 'Dispute raised, admin will review' });
  } catch (error) {
    next(error);
  }
};
