import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

export async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is not set in .env. Using local high-availability fallback.');
    return null;
  }
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log(`✓ MongoDB Atlas Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('⚠️ MongoDB Connection Note:', error.message);
    console.warn('👉 If using MongoDB Atlas, check that your current IP is whitelisted at https://cloud.mongodb.com (Network Access -> Allow 0.0.0.0/0 or Current IP).');
    return null;
  }
}

