import express from 'express';
import Appeal from '../models/Appeal.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const appeals = await Appeal.find().sort({ createdAt: -1 });
    res.json({ success: true, data: appeals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const appeal = new Appeal(req.body);
    await appeal.save();
    res.status(201).json({ success: true, data: appeal });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Appeal.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

