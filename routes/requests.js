import express from 'express';
import Request from '../models/Request.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const reqDoc = new Request(req.body);
    await reqDoc.save();
    res.status(201).json({ success: true, data: reqDoc });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Request.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

