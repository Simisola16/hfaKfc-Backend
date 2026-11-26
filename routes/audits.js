import express from 'express';
import mongoose from 'mongoose';
import Audit from '../models/Audit.js';
import Store from '../models/Store.js';

const router = express.Router();

// GET all audits with search and filtering
router.get('/', async (req, res) => {
  try {
    const { category, auditor, session, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (auditor && auditor !== 'ALL') {
      query.auditor = auditor;
    }

    if (session && session !== 'ALL') {
      query.session = session;
    }

    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { branchCode: { $regex: search, $options: 'i' } },
        { franchisee: { $regex: search, $options: 'i' } },
        { auditor: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [audits, total] = await Promise.all([
      Audit.find(query).sort({ auditDate: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      Audit.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: audits,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single audit
router.get('/:id', async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id);
    if (!audit) return res.status(404).json({ success: false, error: 'Audit not found' });
    res.json({ success: true, data: audit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST record new audit
router.post('/', async (req, res) => {
  try {
    const audit = new Audit(req.body);
    await audit.save();

    // Update store's lastAuditDate and status
    const storeStatus = audit.category === 'Passed' ? 'Passed' :
                        audit.category === 'L3 Critical Fail' ? 'Critical Fail' : 'Under Review';

    await Store.updateOne(
      { $or: [{ branchCode: audit.branchCode }, { name: audit.storeName }] },
      {
        $set: {
          lastAuditDate: audit.auditDate,
          status: storeStatus,
          halalCertified: audit.category === 'Passed'
        }
      }
    );

    res.status(201).json({ success: true, data: audit });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH/PUT update full audit (used by kfc-auditor for products, checklist, outcome sheet)
const updateAuditHandler = async (req, res) => {
  try {
    const { _id, id, createdAt, updatedAt, __v, ...safeBody } = req.body || {};
    const paramId = String(req.params.id || '').trim();
    const filter = mongoose.Types.ObjectId.isValid(paramId)
      ? { _id: paramId }
      : { $or: [{ appId: paramId }, { legacyId: Number(paramId) || -1 }] };

    const audit = await Audit.findOneAndUpdate(
      filter,
      { $set: safeBody },
      { new: true }
    );
    if (!audit) return res.status(404).json({ success: false, error: 'Audit not found' });

    if (audit.category) {
      const storeStatus =
        audit.category === 'Passed'
          ? 'Passed'
          : audit.category === 'L3 Critical Fail'
          ? 'Critical Fail'
          : 'Under Review';

      await Store.updateOne(
        { $or: [{ branchCode: audit.branchCode }, { name: audit.storeName }] },
        {
          $set: {
            lastAuditDate: audit.auditDate,
            status: storeStatus,
            halalCertified: audit.category === 'Passed'
          }
        }
      );
    }

    res.json({ success: true, data: audit });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

router.put('/:id', updateAuditHandler);
router.patch('/:id', updateAuditHandler);

// PATCH change audit category (Approve to Passed, move to Review, flag Other Fail, flag L3)
router.patch('/:id/category', async (req, res) => {
  try {
    const { category, adminDecisionReason, adminJudgedBy, adminJudgedAt } = req.body;
    const updateFields = { category };
    if (typeof adminDecisionReason === 'string') {
      updateFields.adminDecisionReason = adminDecisionReason;
    }
    if (typeof adminJudgedBy === 'string') {
      updateFields.adminJudgedBy = adminJudgedBy;
    }
    if (typeof adminJudgedAt === 'string') {
      updateFields.adminJudgedAt = adminJudgedAt;
    }

    const audit = await Audit.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (audit) {
      const storeStatus = category === 'Passed' ? 'Passed' :
                          category === 'L3 Critical Fail' ? 'Critical Fail' : 'Under Review';

      await Store.updateOne(
        { $or: [{ branchCode: audit.branchCode }, { name: audit.storeName }] },
        {
          $set: {
            status: storeStatus,
            halalCertified: category === 'Passed'
          }
        }
      );
    }

    res.json({ success: true, data: audit });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE single audit
router.delete('/:id', async (req, res) => {
  try {
    const paramId = String(req.params.id || '').trim();
    const filter = mongoose.Types.ObjectId.isValid(paramId)
      ? { _id: paramId }
      : { $or: [{ appId: paramId }, { legacyId: Number(paramId) || -1 }] };

    const deleted = await Audit.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }
    res.json({ success: true, data: deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

