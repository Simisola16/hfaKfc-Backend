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
    if (s.name && s.lat && s.lng) {
      coordsByName.set(String(s.name).trim().toLowerCase(), { lat: s.lat, lng: s.lng });
    }
  });
} catch (e) {}

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  const raw = req.ip || req.socket?.remoteAddress || '';
  return String(raw).replace(/^::ffff:/, '') || '127.0.0.1';
}

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
    const { storeName, auditor, auditAppId, limit = 150 } = req.query;
    const query = {};
    if (storeName) query.storeName = { $regex: String(storeName).trim(), $options: 'i' };
    if (auditor) query.auditor = { $regex: String(auditor).trim(), $options: 'i' };
    if (auditAppId) query.auditAppId = String(auditAppId).trim();

    const logs = await DeviceLog.find(query).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 150, 500));
    const enriched = logs.map(doc => {
      const obj = doc.toObject ? doc.toObject() : { ...doc };
      if (!obj.lat || !obj.lng) {
        const match = obj.storeName ? coordsByName.get(String(obj.storeName).trim().toLowerCase()) : null;
        if (match) {
          obj.lat = Number((match.lat + 0.0012).toFixed(5));
          obj.lng = Number((match.lng - 0.0012).toFixed(5));
        }
      }
      if (!obj.location && obj.lat && obj.lng) {
        obj.location = `Location: ${Number(obj.lat).toFixed(4)},${Number(obj.lng).toFixed(4)}`;
      }
      return obj;
    });
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/logs', async (req, res) => {
  try {
    const clientIp = extractClientIp(req);
    const body = req.body || {};
    const storeName = String(body.storeName || 'KFC Store').trim();
    const match = coordsByName.get(storeName.toLowerCase());

    const lat = Number(body.lat) || match?.lat || 51.5074;
    const lng = Number(body.lng) || match?.lng || -0.1278;
    const location =
      body.location ||
      `Country: UK Location: ${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;

    const log = new DeviceLog({
      auditor: String(body.auditor || 'Auditor').trim(),
      storeName,
      branchCode: String(body.branchCode || '').trim(),
      auditAppId: String(body.auditAppId || '').trim(),
      date: String(body.date || new Date().toISOString().split('T')[0]).trim(),
      time: String(body.time || new Date().toTimeString().split(' ')[0]).trim(),
      activity: String(body.activity || 'Activity').trim(),
      session: String(body.session || 'Round Three 2026').trim(),
      lat,
      lng,
      location,
      ipAddress: String(body.ipAddress || clientIp).trim(),
      device: String(body.device || req.headers['user-agent'] || 'Web Browser').slice(0, 180)
    });

    await log.save();
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
