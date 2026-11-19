import express from 'express';
import Store from '../models/Store.js';
import Franchisee from '../models/Franchisee.js';
import Audit from '../models/Audit.js';
import Product from '../models/Product.js';
import DeviceLog from '../models/DeviceLog.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const [
      totalStores,
      certifiedStores,
      dueStores,
      underReviewStores,
      totalFranchisees,
      totalProducts,
      totalAudits,
      passedAudits,
      rfpAudits,
      reviewAudits,
      otherFailAudits,
      criticalFailAudits,
      recentGpsLogs,
      topFranchiseesRaw
    ] = await Promise.all([
      Store.countDocuments(),
      Store.countDocuments({ status: 'Passed' }),
      Store.countDocuments({ status: 'Due for Audit' }),
      Store.countDocuments({ status: 'Under Review' }),
      Franchisee.countDocuments(),
      Product.countDocuments(),
      Audit.countDocuments(),
      Audit.countDocuments({ category: 'Passed' }),
      Audit.countDocuments({ category: 'Recommend For Pass' }),
      Audit.countDocuments({ category: 'Review List' }),
      Audit.countDocuments({ category: 'Other Fail' }),
      Audit.countDocuments({ category: 'L3 Critical Fail' }),
      DeviceLog.find().sort({ createdAt: -1 }).limit(8),
      Franchisee.find().sort({ storesCount: -1 }).limit(6)
    ]);

    const passRate = totalAudits > 0 ? ((passedAudits / totalAudits) * 100).toFixed(1) : 0;

    // Session aggregation
    const sessions = await Audit.aggregate([
      { $group: { _id: '$session', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    res.json({
      success: true,
      data: {
        totalStores,
        certifiedStores,
        dueStores,
        underReviewStores,
        totalFranchisees,
        totalProducts,
        totalAudits,
        passedAudits,
        rfpAudits,
        reviewAudits,
        otherFailAudits,
        criticalFailAudits,
        passRate,
        topFranchisees: topFranchiseesRaw.map(f => ({
          name: f.name.length > 15 ? f.name.substring(0, 15) + '...' : f.name,
          stores: f.storesCount
        })),
        sessionChart: sessions.map(s => ({
          name: s._id || 'Standard Round',
          audits: s.count
        })),
        recentGpsLogs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

