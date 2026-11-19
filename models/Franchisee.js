import mongoose from 'mongoose';

const franchiseeSchema = new mongoose.Schema({
  legacyId: { type: Number, index: true },
  name: { type: String, required: true, trim: true },
  address: { type: String, default: '' },
  postcode: { type: String, default: '' },
  contactPerson: { type: String, default: 'Operations Lead' },
  phone: { type: String, default: '' },
  dateEntered: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  storesCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

export default mongoose.models.Franchisee || mongoose.model('Franchisee', franchiseeSchema);

