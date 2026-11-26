import express from 'express';
import Assignment from '../models/Assignment.js';
import Store from '../models/Store.js';

const router = express.Router();

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseLocalDay(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();

  // Match DD-MMM-YYYY (e.g. 26-Nov-2026)
  const dmyText = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmyText) {
    const d = Number(dmyText[1]);
    const m = MONTHS.indexOf(dmyText[2].toLowerCase());
    const y = Number(dmyText[3]);
    if (m >= 0) return new Date(y, m, d).getTime();
  }

  // Match YYYY-MM-DD (or ISO prefix)
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])).getTime();
  }

  // Match DD/MM/YYYY
  const dmySlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmySlash) {
    return new Date(Number(dmySlash[3]), Number(dmySlash[2]) - 1, Number(dmySlash[1])).getTime();
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  }
  return null;
}

function isWithinAssignedDateWindow(asg, now = new Date()) {
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTs = parseLocalDay(asg.startDate || asg.date);
  const endTs = parseLocalDay(asg.endDate || asg.startDate || asg.date);
  if (startTs === null) return false;
  const effectiveEnd = endTs !== null ? endTs : startTs;
  return todayTs >= startTs && todayTs <= effectiveEnd;
}

// GET assigned stores for a specific auditor active within the [startDate, endDate] window
router.get('/auditor/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const regex = new RegExp(`^${username.trim()}$`, 'i');
    const allAssignments = await Assignment.find({ auditor: { $regex: regex } }).sort({ date: -1 });
    const assignments = allAssignments.filter((asg) => isWithinAssignedDateWindow(asg));

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
          date: asg.date || '',
          startDate: asg.startDate || asg.date || '',
          endDate: asg.endDate || asg.startDate || asg.date || ''
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

