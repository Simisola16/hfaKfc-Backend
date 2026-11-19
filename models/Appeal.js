import mongoose from 'mongoose';

const appealSchema = new mongoose.Schema({
  auditorName: { type: String, required: true },
  branchCode: { type: String, required: true },
  storeAddress: { type: String, required: true },
  date: { type: String, default: '' },
  appealDate: { type: String, default: '' },
  reasons: { type: String, required: true },
  evidence: { type: String, default: '' },
  status: { type: String, enum: ['Under Investigation', 'Resolved', 'Upheld', 'Dismissed'], default: 'Under Investigation' },
  submittedBy: { type: String, default: 'Franchise Representative' }
}, {
  timestamps: true
});

export default mongoose.models.Appeal || mongoose.model('Appeal', appealSchema);

