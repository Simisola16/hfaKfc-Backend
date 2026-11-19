import express from 'express';
import Feedback from '../models/Feedback.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json({ success: true, data: feedback });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const fb = new Feedback(req.body);
    await fb.save();
    res.status(201).json({ success: true, data: fb });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

