const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const { sendVerificationCode } = require('../services/emailService');

exports.testEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    await sendVerificationCode(email, '000000', 'Test User');
    res.json({ message: 'Test email sent successfully. Check your inbox.' });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    if (user.googleId && !user.password) {
      return res.status(400).json({ message: 'This account uses Google login. Please sign in with Google.' });
    }

    const recentCode = await VerificationCode.findOne({
      user: user._id,
      purpose: 'password_reset',
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
      purpose: 'password_reset',
    });

    const code = VerificationCode.generateCode();
    const codeHash = VerificationCode.hashCode(code);

    await VerificationCode.create({
      user: user._id,
      email: user.email,
      codeHash,
      purpose: 'password_reset',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await sendVerificationCode(user.email, code, user.name);

    res.json({
      message: 'Password reset code sent to your email',
      expiresIn: 900,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    const password = req.body.password;

    if (!email || !code || !password) {
      return res.status(400).json({ message: 'Email, code, and new password are required' });
    }

    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ message: 'Invalid reset code format' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verification = await VerificationCode.findOne({
      user: user._id,
      purpose: 'password_reset',
      usedAt: { $exists: false },
    }).sort({ createdAt: -1 });

    if (!verification) {
      return res.status(400).json({ message: 'No reset code found. Request a new one.' });
    }

    if (new Date() > verification.expiresAt) {
      await VerificationCode.deleteOne({ _id: verification._id });
      return res.status(400).json({ message: 'Reset code has expired. Request a new one.' });
    }

    if (verification.codeHash !== VerificationCode.hashCode(code)) {
      verification.attempts += 1;
      await verification.save();

      if (verification.attempts >= verification.maxAttempts) {
        await VerificationCode.deleteOne({ _id: verification._id });
        return res.status(400).json({
          message: 'Too many failed attempts. Request a new reset code.',
        });
      }

      return res.status(400).json({ message: 'Invalid reset code' });
    }

    verification.usedAt = new Date();
    await verification.save();

    user.password = password;
    await user.save();

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      message: 'Password reset successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
