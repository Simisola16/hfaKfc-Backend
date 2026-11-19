import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  siteName: { type: String, required: true },
  auditDate: { type: String, required: true },
  time: { type: String, default: '12:00:00' },
  rating: { type: Number, default: 5 },
  procedureExplained: { type: String, default: 'Yes' },
  auditorPunctual: { type: String, default: 'Yes' },
  professionalConduct: { type: String, default: 'Very Professional' },
  outcomeDiscussed: { type: String, default: 'Yes' },
  recommendation: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

