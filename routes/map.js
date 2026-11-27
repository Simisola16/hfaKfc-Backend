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
      coordsByName.set(String(s.name).trim().toLowerCase(), {
        lat: Number(s.lat),
        lng: Number(s.lng),
        address: s.address || '',
        postcode: s.postcode || ''
      });
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

function toValidCoord(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? Number(n.toFixed(6)) : null;
}

function toValidAccuracy(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

async function reverseGeocodeServer(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  const fetchJson = async (url, headers = {}, timeoutMs = 3000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  // 1. OpenStreetMap Nominatim for exact street / area / city / postcode / country anywhere
  const osm = await fetchJson(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18`,
    { 'User-Agent': 'HFA-KFC-Portal/1.0' }
  );
  if (osm?.address) {
    const a = osm.address;
    const street = [a.house_number, a.road || a.pedestrian || a.neighbourhood || a.suburb].filter(Boolean).join(' ');
    const city = a.city || a.town || a.village || a.borough || a.county || '';
    const parts = [street, city, a.postcode, a.country_code ? a.country_code.toUpperCase() : ''].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }

  // 2. Fallback for UK coordinates: ONS postcodes.io
  if (lat >= 49.5 && lat <= 61.0 && lng >= -8.5 && lng <= 2.0) {
    const uk = await fetchJson(
      `https://api.postcodes.io/postcodes?lon=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}&limit=1`
    );
    const m = Array.isArray(uk?.result) && uk.result[0] ? uk.result[0] : null;
    if (m) {
      return [m.admin_ward, m.admin_district, m.postcode].filter(Boolean).join(', ');
    }
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function isPlaceholderLocation(str) {
  const s = String(str || '').trim();
  if (!s) return true;
  return /^(Country:\s*UK\s*)?(GPS\s*)?Location:\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/i.test(s) ||
    /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(s);
}

function inferEventType(body) {
  const explicit = String(body.eventType || '').trim().toLowerCase();
  if (['start', 'end', 'milestone', 'login', 'logout'].includes(explicit)) return explicit;
  const act = String(body.activity || '').toLowerCase();
  if (act.includes('new audit') || act.includes('audit start') || act.includes('sinin')) return 'start';
  if (act.includes('recommendation') || act.includes('audit finish') || act.includes('audit complete') || act.includes('sinout')) return 'end';
  if (act.includes('login')) return 'login';
  if (act.includes('logout')) return 'logout';
  return 'milestone';
}

router.get('/stores', async (req, res) => {
  try {
    const stores = await Store.find({}, 'name branchCode address postcode franchisee lat lng status halalCertified');
    const enriched = stores.map(doc => {
      const obj = doc.toObject ? doc.toObject() : { ...doc };
      const match = obj.name ? coordsByName.get(String(obj.name).trim().toLowerCase()) : null;
      if (match && (!Number.isFinite(Number(obj.lat)) || !Number.isFinite(Number(obj.lng)))) {
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
      // Never substitute KFC store coordinates for the auditor's real GPS location
      if (obj.gpsSource === 'store_fallback') {
        obj.lat = null;
        obj.lng = null;
        obj.location = '';
      }
      if (obj.startGpsSource === 'store_fallback') {
        obj.startLat = null;
        obj.startLng = null;
        obj.startLocation = '';
      }
      if (obj.endGpsSource === 'store_fallback') {
        obj.endLat = null;
        obj.endLng = null;
        obj.endLocation = '';
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
    const auditor = String(body.auditor || 'Auditor').trim();
    const storeName = String(body.storeName || 'KFC Store').trim();
    const branchCode = String(body.branchCode || '').trim();
    const auditAppId = String(body.auditAppId || '').trim();
    const date = String(body.date || new Date().toISOString().split('T')[0]).trim();
    const time = String(body.time || new Date().toTimeString().split(' ')[0]).trim();
    const activity = String(body.activity || 'Activity').trim();
    const session = String(body.session || 'Round Three 2026').trim();
    const eventType = inferEventType(body);
    const ipAddress = String(body.ipAddress || clientIp).trim();
    const device = String(body.device || req.headers['user-agent'] || 'Web Browser').slice(0, 180);

    const lat = toValidCoord(body.lat);
    const lng = toValidCoord(body.lng);
    const accuracy = toValidAccuracy(body.accuracy);
    const gpsSource = String(body.gpsSource || (lat !== null && lng !== null ? 'gps' : 'unavailable')).trim();
    let location = String(body.location || '').trim();
    if (lat !== null && lng !== null && isPlaceholderLocation(location)) {
      location = await reverseGeocodeServer(lat, lng);
    }

    // If this is an end/logout event, pair it onto the matching open start/login session so Start & End stay unified
    if (eventType === 'end' || eventType === 'logout') {
      const matchQuery = auditAppId
        ? {
            auditAppId,
            $or: [{ eventType: 'start' }, { startTime: { $exists: true, $ne: '' } }]
          }
        : {
            auditor: new RegExp(`^${auditor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            storeName: new RegExp(`^${storeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            date,
            eventType: eventType === 'logout' ? { $in: ['login', 'start'] } : { $in: ['start', 'login'] },
            $or: [{ endTime: '' }, { endTime: { $exists: false } }]
          };

      const existing = await DeviceLog.findOne(matchQuery).sort({ createdAt: -1 });
      if (existing) {
        const endLat = toValidCoord(body.endLat) ?? lat;
        const endLng = toValidCoord(body.endLng) ?? lng;
        const endAccuracy = toValidAccuracy(body.endAccuracy) ?? accuracy;
        const endGpsSource = String(body.endGpsSource || gpsSource || (endLat !== null && endLng !== null ? 'gps' : 'unavailable')).trim();
        let endLocation = String(body.endLocation || location || '').trim();
        if (endLat !== null && endLng !== null && isPlaceholderLocation(endLocation)) {
          endLocation = await reverseGeocodeServer(endLat, endLng);
        }

        existing.endTime = String(body.endTime || time).trim();
        existing.endDate = String(body.endDate || date).trim();
        existing.endLat = endLat;
        existing.endLng = endLng;
        existing.endAccuracy = endAccuracy;
        existing.endLocation = endLocation;
        existing.endGpsSource = endGpsSource;
        existing.activity = activity;
        existing.time = existing.endTime;
        if (endLat !== null && endLng !== null) {
          existing.lat = endLat;
          existing.lng = endLng;
          existing.accuracy = endAccuracy;
          existing.gpsSource = endGpsSource;
          existing.location = endLocation;
        }
        await existing.save();
        return res.status(200).json({ success: true, data: existing });
      }
    }

    const startLat = toValidCoord(body.startLat) ?? ((eventType === 'start' || eventType === 'login') ? lat : null);
    const startLng = toValidCoord(body.startLng) ?? ((eventType === 'start' || eventType === 'login') ? lng : null);
    const startAccuracy = toValidAccuracy(body.startAccuracy) ?? ((eventType === 'start' || eventType === 'login') ? accuracy : null);
    const startGpsSource = String(body.startGpsSource || ((eventType === 'start' || eventType === 'login') ? gpsSource : '')).trim();
    let startLocation = String(
      body.startLocation || ((eventType === 'start' || eventType === 'login') ? location : '')
    ).trim();
    if (startLat !== null && startLng !== null && isPlaceholderLocation(startLocation)) {
      startLocation = await reverseGeocodeServer(startLat, startLng);
    }

    const endLat = toValidCoord(body.endLat) ?? ((eventType === 'end' || eventType === 'logout') ? lat : null);
    const endLng = toValidCoord(body.endLng) ?? ((eventType === 'end' || eventType === 'logout') ? lng : null);
    const endAccuracy = toValidAccuracy(body.endAccuracy) ?? ((eventType === 'end' || eventType === 'logout') ? accuracy : null);
    const endGpsSource = String(body.endGpsSource || ((eventType === 'end' || eventType === 'logout') ? gpsSource : '')).trim();
    let endLocation = String(
      body.endLocation || ((eventType === 'end' || eventType === 'logout') ? location : '')
    ).trim();
    if (endLat !== null && endLng !== null && isPlaceholderLocation(endLocation)) {
      endLocation = await reverseGeocodeServer(endLat, endLng);
    }

    const log = new DeviceLog({
      auditor,
      storeName,
      branchCode,
      auditAppId,
      date,
      time,
      activity,
      eventType,
      session,
      lat,
      lng,
      accuracy,
      gpsSource,
      location,
      startTime: String(body.startTime || ((eventType === 'start' || eventType === 'login') ? time : '')).trim(),
      startDate: String(body.startDate || ((eventType === 'start' || eventType === 'login') ? date : '')).trim(),
      startLat,
      startLng,
      startAccuracy,
      startLocation,
      startGpsSource,
      endTime: String(body.endTime || ((eventType === 'end' || eventType === 'logout') ? time : '')).trim(),
      endDate: String(body.endDate || ((eventType === 'end' || eventType === 'logout') ? date : '')).trim(),
      endLat,
      endLng,
      endAccuracy,
      endLocation,
      endGpsSource,
      ipAddress,
      device
    });

    await log.save();
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
