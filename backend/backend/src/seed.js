require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@agrilink.rw';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Demo@123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'System Admin';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN_EMAIL }).select('+password');
    if (existing) {
      existing.role = 'admin';
      existing.isVerified = true;
      existing.password = ADMIN_PASSWORD;
      await existing.save();
      console.log(`Admin verified: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      await User.create({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: ADMIN_NAME,
        role: 'admin',
        isVerified: true,
      });
      console.log(`Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    }

    await mongoose.disconnect();
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
