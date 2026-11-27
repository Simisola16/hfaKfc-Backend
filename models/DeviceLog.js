import mongoose from 'mongoose';

const deviceLogSchema = new mongoose.Schema({
  auditor: { type: String, required: true },
  storeName: { type: String, required: true },
  branchCode: { type: String, default: '' },
  auditAppId: { type: String, default: '' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  activity: { type: String, default: 'Store Check-In' },
  eventType: {
    type: String,
    enum: ['start', 'end', 'milestone', 'login', 'logout'],
    default: 'milestone'
  },
  session: { type: String, default: 'Round Two 2026' },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  accuracy: { type: Number, default: null },
  gpsSource: { type: String, default: '' },
  location: { type: String, default: '' },
  startTime: { type: String, default: '' },
  startDate: { type: String, default: '' },
  startLat: { type: Number, default: null },
  startLng: { type: Number, default: null },
  startAccuracy: { type: Number, default: null },
  startLocation: { type: String, default: '' },
  startGpsSource: { type: String, default: '' },
  endTime: { type: String, default: '' },
  endDate: { type: String, default: '' },
  endLat: { type: Number, default: null },
  endLng: { type: Number, default: null },
  endAccuracy: { type: Number, default: null },
  endLocation: { type: String, default: '' },
  endGpsSource: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  device: { type: String, default: 'Web Browser' }
}, {
  timestamps: true
});

deviceLogSchema.index({ storeName: 1, auditor: 1, createdAt: -1 });
deviceLogSchema.index({ auditAppId: 1, createdAt: -1 });

export default mongoose.models.DeviceLog || mongoose.model('DeviceLog', deviceLogSchema);
