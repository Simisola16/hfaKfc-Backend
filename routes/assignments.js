import express from 'express';
import Assignment from '../models/Assignment.js';
import Store from '../models/Store.js';

const router = express.Router();

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function isAssignedForToday(dateStr, now = new Date()) {
  if (!dateStr) return false;
  const s = String(dateStr).trim();
  const targetY = now.getFullYear();
  const targetM = now.getMonth();
  const targetD = now.getDate();

  // Match DD-MMM-YYYY (e.g. 23-Nov-2026)
  const dmyText = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmyText) {
    const d = Number(dmyText[1]);
    const m = MONTHS.indexOf(dmyText[2].toLowerCase());
    const y = Number(dmyText[3]);
    return y === targetY && m === targetM && d === targetD;
  }

  // Match YYYY-MM-DD (or ISO prefix)
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    return Number(ymd[1]) === targetY && Number(ymd[2]) - 1 === targetM && Number(ymd[3]) === targetD;
  }

  // Match DD/MM/YYYY
  const dmySlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmySlash) {
    return Number(dmySlash[3]) === targetY && Number(dmySlash[2]) - 1 === targetM && Number(dmySlash[1]) === targetD;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getFullYear() === targetY && parsed.getMonth() === targetM && parsed.getDate() === targetD;
  }
  return false;
}

// GET assigned stores for a specific auditor on TODAY's allocated date (used by kfc-auditor login)
router.get('/auditor/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const regex = new RegExp(`^${username.trim()}$`, 'i');
    const allAssignments = await Assignment.find({ auditor: { $regex: regex } }).sort({ date: -1 });
    const assignments = allAssignments.filter((asg) => isAssignedForToday(asg.date));

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

