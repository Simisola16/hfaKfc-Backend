import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
  legacyId: { type: Number, index: true },
  storeId: { type: mongoose.Schema.Types.Mixed },
  storeName: { type: String, required: true },
  branchCode: { type: String, required: true },
  address: { type: String, default: '' },
  postcode: { type: String, default: '' },
  franchisee: { type: String, default: '' },
  franchiseeId: { type: Number, default: 0 },
  auditor: { type: String, required: true },
  auditDate: { type: String, required: true },
  timeIn: { type: String, default: '10:00' },
  timeOut: { type: String, default: '12:00' },
  session: { type: String, default: 'Round Two 2026' },
  category: {
    type: String,
    enum: ['Recommend For Pass', 'Review List', 'Passed', 'Other Fail', 'L3 Critical Fail'],
    default: 'Recommend For Pass',
    index: true
  },
  score: { type: Number, default: 90 },
  storeRepresentative: { type: String, default: 'Store Duty Manager' },
  signatureAuditor: { type: String, default: '' }, // base64 or file path
  signatureStoreRep: { type: String, default: '' },
  complianceSummary: {
    rawPoultrySegregation: { type: Boolean, default: true },
    approvedBreadingUse: { type: Boolean, default: true },
    fryerVegetableOilSegregation: { type: Boolean, default: true },
    packagingAndStickers: { type: Boolean, default: true },
    halalCertificateDisplayed: { type: Boolean, default: true },
    staffTrainingCertified: { type: Boolean, default: true },
    auditorNotes: { type: String, default: '' }
  },
  evidencePhotos: [{ type: String }],
  // Extended fields used by kfc-auditor workflow
  appId: { type: String, default: '' },
  auditType: { type: String, default: 'Existing Store' },
  designation: { type: String, default: 'Shift Runner' },
  productsSubmitted: { type: Boolean, default: false },
  checklistSubmitted: { type: Boolean, default: false },
  outcomeSubmitted: { type: Boolean, default: false },
  products: { type: [mongoose.Schema.Types.Mixed], default: [] },
  productComment: { type: String, default: '' },
  checklistScores: { type: mongoose.Schema.Types.Mixed, default: {} },
  checklistComments: { type: mongoose.Schema.Types.Mixed, default: {} },
  randomChecks: { type: [mongoose.Schema.Types.Mixed], default: [] },
  checklistOverallComment: { type: String, default: '' },
  outcomeData: { type: mongoose.Schema.Types.Mixed, default: null }
}, {
  timestamps: true
});

auditSchema.index({ category: 1, auditor: 1, session: 1, auditDate: -1 });

export default mongoose.models.Audit || mongoose.model('Audit', auditSchema);

