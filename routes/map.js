import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from '../models/Store.js';
import DeviceLog from '../models/DeviceLog.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const coordsByName = new Map();

try {
  const rawStores = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/stores.json'), 'utf8'));
  rawStores.forEach(s => {
    if (s.name && s.lat && s.lng) coordsByName.set(String(s.name).trim().toLowerCase(), { lat: s.lat, lng: s.lng });
  });
} catch (e) {}

router.get('/stores', async (req, res) => {
  try {
    const stores = await Store.find({}, 'name branchCode address postcode franchisee lat lng status halalCertified');
    const enriched = stores.map(doc => {
      const obj = doc.toObject ? doc.toObject() : { ...doc };
      const match = obj.name ? coordsByName.get(String(obj.name).trim().toLowerCase()) : null;
      if (match) {
        obj.lat = match.lat;
        obj.lng = match.lng;
      }
      return obj;
    });
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const logs = await DeviceLog.find().sort({ createdAt: -1 }).limit(100);
    const enriched = logs.map(doc => {
      const obj = doc.toObject ? doc.toObject() : { ...doc };
      const match = obj.storeName ? coordsByName.get(String(obj.storeName).trim().toLowerCase()) : null;
      if (match) {
        obj.lat = Number((match.lat + 0.0012).toFixed(5));
        obj.lng = Number((match.lng - 0.0012).toFixed(5));
      }
      return obj;
    });
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
