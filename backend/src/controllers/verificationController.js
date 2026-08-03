const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const { sendVerificationCode } = require('../services/emailService');

exports.sendCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const recentCode = await VerificationCode.findOne({
      user: user._id,
      purpose: 'email_verification',
      createdAt: { $gt: new Date(Date.now() - 60000) },
    });
    if (recentCode) {
      const waitSeconds = Math.ceil((recentCode.createdAt.getTime() + 60000 - Date.now()) / 1000);
      return res.status(429).json({
        message: `Please wait ${waitSeconds} seconds before requesting a new code`,
      });
    }

    await VerificationCode.deleteMany({
      user: user._id,
      purpose: 'email_verification',
    });

    const code = VerificationCode.generateCode();
    const codeHash = VerificationCode.hashCode(code);

    await VerificationCode.create({
      user: user._id,
      email: user.email,
      codeHash,
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await sendVerificationCode(user.email, code, user.name);

    res.json({
      message: 'Verification code sent to your email',
      expiresIn: 900,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Email already verified', alreadyVerified: true });
    }

    const recentAttempts = await VerificationCode.countDocuments({
      user: user._id,
      purpose: 'email_verification',
      createdAt: { $gt: new Date(Date.now() - 60000) },
      usedAt: { $exists: false },
    });
    if (recentAttempts > 10) {
      return res.status(429).json({
        message: 'Too many verification attempts. Please wait before trying again.',
      });
    }

    const verification = await VerificationCode.findOne({
      user: user._id,
      purpose: 'email_verification',
      usedAt: { $exists: false },
    }).sort({ createdAt: -1 });

    if (!verification) {
      return res.status(400).json({ message: 'No verification code found. Request a new one.' });
    }

    if (new Date() > verification.expiresAt) {
      await VerificationCode.deleteOne({ _id: verification._id });
      return res.status(400).json({ message: 'Verification code has expired. Request a new one.' });
    }

    verification.attempts += 1;
    await verification.save();

    if (verification.attempts > verification.maxAttempts) {
      await VerificationCode.deleteOne({ _id: verification._id });
      return res.status(400).json({
        message: 'Too many failed attempts. Request a new verification code.',
      });
    }

    const codeHash = VerificationCode.hashCode(code);
    if (verification.codeHash !== codeHash) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    verification.usedAt = new Date();
    await verification.save();

    user.isVerified = true;
    await user.save();

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.checkStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ isVerified: user.isVerified });
  } catch (error) {
    next(error);
  }
};
