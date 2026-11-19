import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  storeName: { type: String, required: true },
  branchCode: { type: String, default: '' },
  franchisee: { type: String, default: '' },
  auditor: { type: String, required: true },
  date: { type: String, required: true },
  session: { type: String, default: 'Round Two 2026' },
  status: { type: String, enum: ['Scheduled', 'In Progress', 'Completed'], default: 'Scheduled' },
  notification: { type: String, default: 'E-mail Dispatched' }
}, {
  timestamps: true
});

export default mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);

