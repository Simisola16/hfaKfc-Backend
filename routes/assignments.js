import express from 'express';
import Assignment from '../models/Assignment.js';
import Store from '../models/Store.js';

const router = express.Router();

// GET assigned stores for a specific auditor (used by kfc-auditor login)
router.get('/auditor/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const regex = new RegExp(`^${username.trim()}$`, 'i');
    const assignments = await Assignment.find({ auditor: { $regex: regex } }).sort({ date: -1 });

    // Enrich with store details (address, storeId, franchisee)
    const stores = await Promise.all(
      assignments.map(async (asg) => {
        const storeDoc = await Store.findOne({
          $or: [{ branchCode: asg.branchCode }, { name: asg.storeName }]
        });
        return {
          id: String(asg.branchCode || storeDoc?.branchCode || asg._id),
          assignmentId: String(asg._id),
          name: asg.storeName,
          shortName: asg.storeName,
          code: String(asg.branchCode || storeDoc?.branchCode || ''),
          branchCode: String(asg.branchCode || storeDoc?.branchCode || ''),
          address: storeDoc?.address || asg.storeName,
          franchiseeName: asg.franchisee || storeDoc?.franchisee || '',
          session: asg.session || '',
          status: asg.status || 'Scheduled',
          date: asg.date || ''
        };
      })
    );

    res.json({ success: true, data: stores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { session, auditor, search } = req.query;
    const query = {};

    if (session && session !== 'ALL') query.session = session;
    if (auditor && auditor !== 'ALL') query.auditor = auditor;
    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { auditor: { $regex: search, $options: 'i' } },
        { franchisee: { $regex: search, $options: 'i' } }
      ];
    }

    const assignments = await Assignment.find(query).sort({ date: -1 });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const asg = new Assignment(req.body);
    await asg.save();
    res.status(201).json({ success: true, data: asg });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

