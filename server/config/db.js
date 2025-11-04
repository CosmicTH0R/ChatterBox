// config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ DB Connection failed:', err.message);
    process.exit(1);
  }
};
