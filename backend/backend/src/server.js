require('dotenv').config();
const connectDB = require('./config/db');
const { server } = require('./app');
const User = require('./models/User');
const { checkAndCloseExpiredAuctions } = require('./controllers/auctionController');

const PORT = process.env.PORT || 5000;

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@agrilink.rw';
  const password = process.env.ADMIN_PASSWORD || 'Demo@123';
  const name = process.env.ADMIN_NAME || 'System Admin';
  const existing = await User.findOne({ email }).select('+password');
  if (existing) {
    existing.role = 'admin';
    existing.isVerified = true;
    existing.password = password;
    await existing.save();
    console.log(`   ✓ Admin verified: ${email} / ${password}`);
    return;
  }
  const user = await User.create({ email, password, name, role: 'admin', isVerified: true });
  console.log(`   ✓ Admin created: ${email} / ${password}`);
};

const seedDemoUsers = async () => {
  const demos = [
    { email: 'farmer@demo.rw', password: 'Demo@123', name: 'Jean Farmer', role: 'farmer' },
    { email: 'buyer@demo.rw', password: 'Demo@123', name: 'Alice Buyer', role: 'buyer', walletBalance: 500000 },
    { email: 'transporter@demo.rw', password: 'Demo@123', name: 'Paul Transporter', role: 'transporter' },
  ];
  const Farmer = require('./models/Farmer');
  for (const u of demos) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      const user = await User.create({ ...u, isVerified: true });
      if (user.role === 'farmer') {
        await Farmer.create({ user: user._id });
      }
      console.log(`   ✓ ${u.role} created: ${u.email} / ${u.password}`);
    }
  }
};

const seedMobileAccounts = async () => {
  const MobileAccount = require('./models/MobileAccount');
  const demoAccounts = [
    { phone: '0727132113', network: 'airtel', balance: 200000, pin: '1111' },
    { phone: '0781234567', network: 'mtn', balance: 100000, pin: '2222' },
  ];
  for (const acct of demoAccounts) {
    const exists = await MobileAccount.findOne({ phone: acct.phone, network: acct.network });
    if (!exists) {
      await MobileAccount.create(acct);
      console.log(`   ✓ MobileAccount seeded: ${acct.phone} @ ${acct.network} (${acct.balance} RWF)`);
    }
  }
};



const startServer = async () => {
  try {
    await connectDB();
  } catch (dbError) {
    console.error(`\n❌ Failed to connect to MongoDB.`);
    console.error(`   Make sure MongoDB is running.`);
    console.error(`   URI: ${process.env.MONGODB_URI}`);
    console.error(`\n   Start MongoDB with:`);
    console.error(`   mongod`);
    console.error(`   Or via MongoDB Compass\n`);
    process.exit(1);
  }

  try {
    await seedAdmin();
    await seedDemoUsers();
    await seedMobileAccounts();
  } catch (seedError) {
    console.error('Seed warning:', seedError.message);
  }

  setInterval(checkAndCloseExpiredAuctions, 60 * 1000);

  const emailConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;
  if (!emailConfigured) {
    console.log('\n⚠️  EMAIL NOT CONFIGURED');
    console.log('   Registration and password reset will FAIL until you configure email.');
    console.log('   Open backend/.env and set EMAIL_USER and EMAIL_PASS.');
  }

  const MAX_PORT_RETRIES = 5;
  const tryPort = async (port, attempt = 0) => {
    if (attempt > MAX_PORT_RETRIES) {
      console.error(`\n❌ Unable to bind to a port after ${MAX_PORT_RETRIES} attempts.`);
      console.error('   Please stop the process using port 5000 or set PORT in backend/.env to an available port.');
      process.exit(1);
      return;
    }

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`\n⚠️  Port ${port} already in use. Trying ${port + 1}...`);
        tryPort(port + 1, attempt + 1);
      } else {
        console.error(error);
        process.exit(1);
      }
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`\n========================================`);
      console.log(`  Agri-Link Rwanda API Server`);
      console.log(`  Running on:  http://localhost:${port}`);
      console.log(`  Health:      http://localhost:${port}/api/health`);
      console.log(`========================================\n`);
    });
  };

  tryPort(PORT);
};

startServer();
