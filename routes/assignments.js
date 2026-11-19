import express from 'express';
import Assignment from '../models/Assignment.js';

const router = express.Router();

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

