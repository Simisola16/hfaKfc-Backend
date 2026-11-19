import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  fullName: { type: String, required: true },
  role: {
    type: String,
    default: 'Auditor'
  },
  email: { type: String, default: '' },
  password: { type: String, default: '@abc123' },
  active: { type: Boolean, default: true },
  department: { type: String, default: 'Audit Operations' }
}, {
  timestamps: true
});

export default mongoose.models.User || mongoose.model('User', userSchema);
