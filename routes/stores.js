import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from '../models/Store.js';
import Franchisee from '../models/Franchisee.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const coordsByCode = new Map();
const coordsByName = new Map();

try {
  const rawStores = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/stores.json'), 'utf8'));
  rawStores.forEach(s => {
    if (s.branchCode && s.lat && s.lng) coordsByCode.set(String(s.branchCode).trim().toUpperCase(), { lat: s.lat, lng: s.lng });
    if (s.name && s.lat && s.lng) coordsByName.set(String(s.name).trim().toLowerCase(), { lat: s.lat, lng: s.lng });
  });
} catch (e) {}

function attachRealUkCoords(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const match =
    (obj.branchCode && coordsByCode.get(String(obj.branchCode).trim().toUpperCase())) ||
    (obj.name && coordsByName.get(String(obj.name).trim().toLowerCase()));
  if (match) {
    obj.lat = match.lat;
    obj.lng = match.lng;
  }
  return obj;
}

// GET all stores with search & filtering
router.get('/', async (req, res) => {
  try {
    const { search, franchisee, status, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { branchCode: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { postcode: { $regex: search, $options: 'i' } }
      ];
    }

    if (franchisee && franchisee !== 'ALL') {
      query.franchisee = franchisee;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [stores, total] = await Promise.all([
      Store.find(query).sort({ branchCode: 1 }).skip(skip).limit(Number(limit)),
      Store.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: stores.map(attachRealUkCoords),
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

// GET single store
router.get('/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, error: 'Store not found' });
    res.json({ success: true, data: attachRealUkCoords(store) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create store
router.post('/', async (req, res) => {
  try {
    const store = new Store(req.body);
    await store.save();

    if (store.franchisee) {
      await Franchisee.updateOne({ name: store.franchisee }, { $inc: { storesCount: 1 } });
    }

    res.status(201).json({ success: true, data: store });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update store
router.put('/:id', async (req, res) => {
  try {
    const updated = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE store
router.delete('/:id', async (req, res) => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (store && store.franchisee) {
      await Franchisee.updateOne({ name: store.franchisee }, { $inc: { storesCount: -1 } });
    }
    res.json({ success: true, message: 'Store deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
