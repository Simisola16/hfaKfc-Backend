import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  branchCode: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  postcode: { type: String, required: true, trim: true },
  franchisee: { type: String, required: true, trim: true },
  franchiseeId: { type: Number, default: 0 },
  contactPerson: { type: String, default: 'Store Manager' },
  contactPhone: { type: String, default: '' },
  lat: { type: Number, default: 51.5074 },
  lng: { type: Number, default: -0.1278 },
  status: {
    type: String,
    enum: ['Passed', 'Due for Audit', 'Under Review', 'Action Required', 'Critical Fail'],
    default: 'Due for Audit'
  },
  lastAuditDate: { type: String, default: '' },
  nextAuditDueDate: { type: String, default: '' },
  halalCertified: { type: Boolean, default: false },
  certificateNumber: { type: String, default: null }
}, {
  timestamps: true
});

storeSchema.index({ branchCode: 1, name: 1, franchisee: 1, postcode: 1 });

export default mongoose.models.Store || mongoose.model('Store', storeSchema);

