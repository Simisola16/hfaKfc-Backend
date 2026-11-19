import mongoose from 'mongoose';

const deviceLogSchema = new mongoose.Schema({
  auditor: { type: String, required: true },
  storeName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  activity: { type: String, default: 'Store Check-In' },
  session: { type: String, default: 'Round Two 2026' },
  lat: { type: Number, default: 51.5074 },
  lng: { type: Number, default: -0.1278 },
  device: { type: String, default: 'Handheld PDA' }
}, {
  timestamps: true
});

export default mongoose.models.DeviceLog || mongoose.model('DeviceLog', deviceLogSchema);

