import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  branchCode: { type: String, default: '' },
  storeName: { type: String, default: '' },
  address: { type: String, default: '' },
  postcode: { type: String, default: '' },
  franchisee: { type: String, default: '' },
  contactPerson: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  requestType: { type: String, default: 'Store Halal Conversion' },
  productName: { type: String, default: '' },
  productCategory: { type: String, default: '' },
  supplier: { type: String, default: '' },
  productCode: { type: String, default: '' },
  notes: { type: String, default: '' },
  source: { type: String, default: 'KFC HQ' },
  status: { type: String, default: 'Pending' },
  date: { type: String, default: '' },
  openingDate: { type: String, default: '' },
  closingDate: { type: String, default: '' }
}, {
  timestamps: true
});

export default mongoose.models.Request || mongoose.model('Request', requestSchema);
