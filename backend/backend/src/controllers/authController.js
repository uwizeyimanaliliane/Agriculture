const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const VerificationCode = require('../models/VerificationCode');
const { sendVerificationCode } = require('../services/emailService');
const { verifyGoogleToken } = require('../services/googleAuth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, name, phone, role, province, district, sector, village } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      await VerificationCode.deleteMany({ user: existingUser._id });
      await Farmer.deleteOne({ user: existingUser._id });
      await User.deleteOne({ _id: existingUser._id });
    }

    const isAdmin = role === 'admin';
    const user = await User.create({
      email, password, name, phone, role, isVerified: isAdmin,
      location: { province, district, sector, village },
    });

    if (role === 'farmer') {
      await Farmer.create({ user: user._id });
    }

    if (isAdmin) {
      const token = generateToken(user._id);
      return res.status(201).json({
        message: 'Admin account created successfully.',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: true,
        },
      });
    }

    const code = VerificationCode.generateCode();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    await VerificationCode.create({
      user: user._id,
      email: user.email,
      codeHash,
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    try {
      await sendVerificationCode(user.email, code, user.name);
    } catch (emailErr) {
      console.warn('Email sending failed, verification code logged to console:', emailErr.message);
    }

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      needsVerification: true,
      email: user.email,
      userId: user._id,
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'This account uses Google login' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      if (user.role === 'admin') {
        user.isVerified = true;
        await user.save();
      } else {
        return res.status(403).json({
          message: 'Please verify your email before logging in',
          needsVerification: true,
          email: user.email,
          userId: user._id,
        });
      }
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
        location: {
          province: user.location?.province,
          district: user.location?.district,
          sector: user.location?.sector,
          village: user.location?.village,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken || typeof idToken !== 'string' || !idToken.includes('.')) {
      return res.status(400).json({ message: 'A valid Google id_token is required.' });
    }
    const googleUser = await verifyGoogleToken(idToken);

    let user = await User.findOne({ email: googleUser.email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleUser.googleId;
        user.avatar = googleUser.avatar;
      }
      if (role && !user.role) {
        user.role = role;
      }
      if (role && role !== user.role && ['buyer', 'farmer'].includes(role)) {
        user.role = role;
      }
      await user.save();
    } else {
      user = await User.create({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        avatar: googleUser.avatar,
        role: role || 'buyer',
        isVerified: true,
      });

      if (user.role === 'farmer') {
        await Farmer.create({ user: user._id });
      }
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
        location: {
          province: user.location?.province,
          district: user.location?.district,
          sector: user.location?.sector,
          village: user.location?.village,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, preferredLanguage, darkMode, province, district, sector, village } = req.body;
    const updateData = { name, phone, preferredLanguage, darkMode };
    if (province !== undefined) updateData['location.province'] = province;
    if (district !== undefined) updateData['location.district'] = district;
    if (sector !== undefined) updateData['location.sector'] = sector;
    if (village !== undefined) updateData['location.village'] = village;
    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google login, no password to change' });
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.json({ message: 'FCM token updated' });
  } catch (error) {
    next(error);
  }
};

exports.updateLocation = async (req, res, next) => {
  try {
    const { coordinates, province, district, sector, village } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        location: {
          type: 'Point',
          coordinates,
          province,
          district,
          sector,
          village,
        },
      },
      { new: true }
    );
    res.json({ user });
  } catch (error) {
    next(error);
  }
};
