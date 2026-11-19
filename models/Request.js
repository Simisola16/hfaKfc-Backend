import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  branchCode: { type: String, required: true },
  storeName: { type: String, required: true },
  address: { type: String, default: '' },
  postcode: { type: String, default: '' },
  franchisee: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  requestType: { type: String, default: 'Store Halal Conversion' },
  status: { type: String, default: 'Pending' },
  date: { type: String, default: '' },
  openingDate: { type: String, default: '' },
  closingDate: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.models.Request || mongoose.model('Request', requestSchema);
