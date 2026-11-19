import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { fallbackApiMiddleware } from './fallbackMiddleware.js';

import dashboardRoutes from './routes/dashboard.js';
import storeRoutes from './routes/stores.js';
import franchiseeRoutes from './routes/franchisees.js';
import auditRoutes from './routes/audits.js';
import productRoutes from './routes/products.js';
import assignmentRoutes from './routes/assignments.js';
import requestRoutes from './routes/requests.js';
import appealRoutes from './routes/appeals.js';
import feedbackRoutes from './routes/feedback.js';
import mapRoutes from './routes/map.js';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Connect to MongoDB Atlas
connectDB();

// Seamless high-availability fallback middleware when MongoDB Atlas is connecting or IP-restricted
app.use(fallbackApiMiddleware);

// API Routes (Mongoose)
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/franchisees', franchiseeRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/products', productRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'healthy',
    service: 'HFA KFC UK Portal Backend',
    database: isConnected ? 'MongoDB Atlas Connected' : 'Local High-Availability Store Active',
    dbReadyState: mongoose.connection.readyState,
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 KFC Admin API Server running on port ${PORT}`);
  console.log(`👉 Health check: http://localhost:${PORT}/api/health`);
});
