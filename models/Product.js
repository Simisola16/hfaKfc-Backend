import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  supplier: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Frozen', 'Chilled', 'Ambient'],
    default: 'Ambient',
    index: true
  },
  manufacturer: { type: String, default: 'Certified European Facility' },
  siteEcCode: { type: String, default: 'UK 4022 EC' },
  status: { type: String, default: 'Accepted' },
  dateApproved: { type: String, default: '' },
  notes: { type: String, default: '' },
  documents: [{ type: String }]
}, {
  timestamps: true
});

productSchema.index({ name: 1, supplier: 1, code: 1 });

export default mongoose.models.Product || mongoose.model('Product', productSchema);

