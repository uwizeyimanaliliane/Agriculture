const mongoose = require('mongoose');

const connectDB = async (retries = 3) => {
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw new Error(`MongoDB connection failed: ${error.message}`);
      }
      console.log(`MongoDB connection failed, retrying... (${retries} attempts left)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

module.exports = connectDB;
