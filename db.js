import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://olamilekanmuhayad_db_user:yNLID7xso4SGtSCm@kfchfa.q1axxfm.mongodb.net/kfc_hfa?retryWrites=true&w=majority";

export async function connectDB() {
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

