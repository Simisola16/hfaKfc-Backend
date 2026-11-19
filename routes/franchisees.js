import express from 'express';
import Franchisee from '../models/Franchisee.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const franchisees = await Franchisee.find().sort({ storesCount: -1, name: 1 });
    res.json({ success: true, data: franchisees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const fran = new Franchisee(req.body);
    await fran.save();
    res.status(201).json({ success: true, data: fran });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Franchisee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

