import mongoose from 'mongoose';

const kfcUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    role: {
      type: String,
      enum: ['KFC HQ Director', 'KFC HQ Manager', 'KFC Request Coordinator'],
      default: 'KFC HQ Manager'
    },
    department: { type: String, default: 'KFC Headquarters' },
    password: { type: String, required: true },
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: 'HFA Admin' },
    lastLoginAt: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.KfcUser || mongoose.model('KfcUser', kfcUserSchema);
