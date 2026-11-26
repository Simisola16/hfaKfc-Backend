import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');

function loadJson(filename) {
  try {
    const raw = fs.readFileSync(path.join(dataDir, filename), 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map((item, idx) => ({
      ...item,
      _id: String(item._id || item.id || `${filename}-${idx + 1}`),
      id: String(item.id || item._id || `${filename}-${idx + 1}`)
    })) : [];
  } catch (e) {
    return [];
  }
}

// Live in-memory store seeded from official MSSQL exports in backend/data/*.json
const memoryDB = {
  stores: loadJson('stores.json'),
  franchisees: loadJson('franchisees.json'),
  audits: loadJson('audits.json'),
  products: loadJson('products.json'),
  assignments: loadJson('assignments.json'),
  requests: loadJson('store_requests.json'),
  appeals: loadJson('appeals.json'),
  feedback: loadJson('feedback.json'),
  logs: loadJson('auditor_logs.json'),
  users: loadJson('users.json'),
  kfcUsers: [],
};

export function fallbackApiMiddleware(req, res, next) {
  // If MongoDB Atlas is connected, pass directly to the Mongoose route handlers
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  const urlPath = req.path;
  const method = req.method.toUpperCase();

  // 1. Auth login
  if (urlPath === '/api/auth/login' && method === 'POST') {
    const { username, password } = req.body || {};
    const found = memoryDB.users.find(
      u => u.username?.toLowerCase() === String(username || '').trim().toLowerCase()
    );
    if (found && found.active !== false && found.password === password) {
      return res.json({
        success: true,
        data: {
          id: found.id || found._id,
          username: found.username,
          fullName: found.fullName,
          role: found.role,
          email: found.email,
          token: `kfc_jwt_${Date.now()}`
        }
      });
    }
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  // 2. Stores
  if (urlPath === '/api/stores' && method === 'GET') {
    const { search, franchisee, status, page = 1, limit = 300 } = req.query;
    let list = [...memoryDB.stores];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.branchCode?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.postcode?.toLowerCase().includes(q)
      );
    }
    if (franchisee && franchisee !== 'ALL') {
      list = list.filter(s => s.franchisee === franchisee);
    }
    if (status && status !== 'ALL') {
      list = list.filter(s => s.status === status);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const paged = list.slice(skip, skip + Number(limit));
    return res.json({
      success: true,
      data: paged,
      pagination: { total: list.length, page: Number(page), limit: Number(limit), pages: Math.ceil(list.length / Number(limit)) }
    });
  }

  if (urlPath === '/api/stores' && method === 'POST') {
    const id = `store-${Date.now()}`;
    const newStore = { ...req.body, id, _id: id };
    memoryDB.stores.unshift(newStore);
    return res.status(201).json({ success: true, data: newStore });
  }

  if (urlPath.startsWith('/api/stores/') && (method === 'PUT' || method === 'DELETE')) {
    const id = urlPath.split('/').pop();
    if (method === 'DELETE') {
      memoryDB.stores = memoryDB.stores.filter(s => String(s.id) !== id && String(s._id) !== id);
      return res.json({ success: true, message: 'Store deleted' });
    }
    let updated = null;
    memoryDB.stores = memoryDB.stores.map(s => {
      if (String(s.id) === id || String(s._id) === id) {
        updated = { ...s, ...req.body };
        return updated;
      }
      return s;
    });
    return res.json({ success: true, data: updated || req.body });
  }

  // 3. Franchisees
  if (urlPath === '/api/franchisees' && method === 'GET') {
    return res.json({ success: true, data: memoryDB.franchisees });
  }
  if (urlPath === '/api/franchisees' && method === 'POST') {
    const id = `fran-${Date.now()}`;
    const item = { ...req.body, id, _id: id };
    memoryDB.franchisees.unshift(item);
    return res.status(201).json({ success: true, data: item });
  }

  // 4. Audits
  if (urlPath === '/api/audits' && method === 'GET') {
    const { category, auditor, session, search, page = 1, limit = 500 } = req.query;
    let list = [...memoryDB.audits];
    if (category && category !== 'ALL') list = list.filter(a => a.category === category);
    if (auditor && auditor !== 'ALL') list = list.filter(a => a.auditor === auditor);
    if (session && session !== 'ALL') list = list.filter(a => a.session === session);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.storeName?.toLowerCase().includes(q) ||
        a.branchCode?.toLowerCase().includes(q) ||
        a.franchisee?.toLowerCase().includes(q) ||
        a.auditor?.toLowerCase().includes(q)
      );
    }
    const skip = (Number(page) - 1) * Number(limit);
    const paged = list.slice(skip, skip + Number(limit));
    return res.json({
      success: true,
      data: paged,
      pagination: { total: list.length, page: Number(page), limit: Number(limit), pages: Math.ceil(list.length / Number(limit)) }
    });
  }

  if (urlPath === '/api/audits' && method === 'POST') {
    const id = `aud-${Date.now()}`;
    const item = { ...req.body, id, _id: id };
    memoryDB.audits.unshift(item);
    return res.status(201).json({ success: true, data: item });
  }

  if (urlPath.startsWith('/api/audits/') && urlPath.endsWith('/category') && method === 'PATCH') {
    const parts = urlPath.split('/');
    const id = parts[parts.length - 2];
    const { category } = req.body || {};
    let updated = null;
    memoryDB.audits = memoryDB.audits.map(a => {
      if (String(a.id) === id || String(a._id) === id) {
        updated = { ...a, category };
        return updated;
      }
      return a;
    });
    return res.json({ success: true, data: updated || { id, category } });
  }

  if (urlPath.startsWith('/api/audits/') && (method === 'PUT' || method === 'PATCH')) {
    const id = urlPath.split('/').pop();
    let updated = null;
    memoryDB.audits = memoryDB.audits.map(a => {
      if (String(a.id) === id || String(a._id) === id || String(a.appId) === id) {
        updated = { ...a, ...req.body };
        return updated;
      }
      return a;
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }
    return res.json({ success: true, data: updated });
  }

  // 5. Products
  if (urlPath === '/api/products' && method === 'GET') {
    return res.json({ success: true, data: memoryDB.products });
  }
  if (urlPath === '/api/products' && method === 'POST') {
    const id = `prod-${Date.now()}`;
    const item = { ...req.body, id, _id: id };
    memoryDB.products.unshift(item);
    return res.status(201).json({ success: true, data: item });
  }

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseLocalDay(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const dmyText = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmyText) {
    const d = Number(dmyText[1]);
    const m = MONTHS.indexOf(dmyText[2].toLowerCase());
    const y = Number(dmyText[3]);
    if (m >= 0) return new Date(y, m, d).getTime();
  }
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])).getTime();
  }
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

  // 6. Assignments
  if (urlPath.startsWith('/api/assignments/auditor/') && method === 'GET') {
    const username = decodeURIComponent(urlPath.split('/').pop() || '').trim().toLowerCase();
    const matched = memoryDB.assignments.filter(
      a => String(a.auditor || '').trim().toLowerCase() === username && isWithinAssignedDateWindow(a)
    );
    const stores = matched.map((asg, idx) => {
      const storeDoc = memoryDB.stores.find(
        s => String(s.branchCode) === String(asg.branchCode) || String(s.name).toLowerCase() === String(asg.storeName).toLowerCase()
      );
      return {
        id: String(asg.branchCode || storeDoc?.branchCode || asg.id || idx + 1),
        assignmentId: String(asg.id || asg._id || idx + 1),
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
    });
    return res.json({ success: true, data: stores });
  }

  if (urlPath === '/api/assignments' && method === 'GET') {
    const { session, auditor, search } = req.query;
    let list = [...memoryDB.assignments];
    if (session && session !== 'ALL') list = list.filter(a => a.session === session);
    if (auditor && auditor !== 'ALL') {
      list = list.filter(a => String(a.auditor || '').toLowerCase() === String(auditor).toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.storeName?.toLowerCase().includes(q) ||
        a.auditor?.toLowerCase().includes(q) ||
        a.franchisee?.toLowerCase().includes(q)
      );
    }
    return res.json({ success: true, data: list });
  }
  if (urlPath === '/api/assignments' && method === 'POST') {
    const id = `asg-${Date.now()}`;
    const item = { ...req.body, id, _id: id };
    memoryDB.assignments.unshift(item);
    return res.status(201).json({ success: true, data: item });
  }

  // 7. Requests
  if (urlPath === '/api/requests' && method === 'GET') {
    return res.json({ success: true, data: memoryDB.requests });
  }
  if (urlPath === '/api/requests' && method === 'POST') {
    const id = `req-${Date.now()}`;
    const item = { ...req.body, id, _id: id, status: req.body?.status || 'Pending' };
    memoryDB.requests.unshift(item);
    return res.status(201).json({ success: true, data: item });
  }
  if (urlPath.startsWith('/api/requests/') && urlPath.endsWith('/status') && method === 'PATCH') {
    const parts = urlPath.split('/');
    const id = parts[parts.length - 2];
    const { status } = req.body || {};
    let updated = null;
    memoryDB.requests = memoryDB.requests.map(r => {
      if (String(r.id) === id || String(r._id) === id) {
        updated = { ...r, status };
        return updated;
      }
      return r;
    });
    return res.json({ success: true, data: updated || { id, status } });
  }

  // 8. Appeals
  if (urlPath === '/api/appeals' && method === 'GET') {
    return res.json({ success: true, data: memoryDB.appeals });
  }
  if (urlPath === '/api/appeals' && method === 'POST') {
    const id = `app-${Date.now()}`;
    const item = { ...req.body, id, _id: id };
    memoryDB.appeals.unshift(item);
    return res.status(201).json({ success: true, data: item });
  }
  if (urlPath.startsWith('/api/appeals/') && urlPath.endsWith('/status') && method === 'PATCH') {
    const parts = urlPath.split('/');
    const id = parts[parts.length - 2];
    const { status } = req.body || {};
    let updated = null;
    memoryDB.appeals = memoryDB.appeals.map(ap => {
      if (String(ap.id) === id || String(ap._id) === id) {
        updated = { ...ap, status };
        return updated;
      }
      return ap;
    });
    return res.json({ success: true, data: updated || { id, status } });
  }

  // 9. Feedback
  if (urlPath === '/api/feedback' && method === 'GET') {
    return res.json({ success: true, data: memoryDB.feedback });
  }
  if (urlPath === '/api/feedback' && method === 'POST') {
    const id = `fb-${Date.now()}`;
    const item = { ...req.body, id, _id: id };
    memoryDB.feedback.unshift(item);
    return res.status(201).json({ success: true, data: item });
  }

  // 10. Map
  if (urlPath === '/api/map/stores' && method === 'GET') {
    return res.json({ success: true, data: memoryDB.stores });
  }
  if (urlPath === '/api/map/logs' && method === 'GET') {
    return res.json({ success: true, data: memoryDB.logs });
  }

  // 11. Users
  if (urlPath === '/api/users' && method === 'GET') {
    return res.json({ success: true, data: memoryDB.users });
  }
  if (urlPath === '/api/users' && method === 'POST') {
    const id = `usr-${Date.now()}`;
    const item = { ...req.body, id, _id: id };
    memoryDB.users.unshift(item);
    return res.status(201).json({ success: true, data: item });
  }
  if (urlPath.startsWith('/api/users/') && urlPath.endsWith('/toggle') && method === 'PATCH') {
    const parts = urlPath.split('/');
    const id = parts[parts.length - 2];
    let updated = null;
    memoryDB.users = memoryDB.users.map(u => {
      if (String(u.id) === id || String(u._id) === id) {
        updated = { ...u, active: !u.active };
        return updated;
      }
      return u;
    });
    return res.json({ success: true, data: updated || { id } });
  }

  // 12. KFC HQ Users (fallback)
  if (urlPath === '/api/kfc-users' && method === 'GET') {
    return res.json({
      success: true,
      data: memoryDB.kfcUsers.map(({ password, ...rest }) => rest)
    });
  }
  if (urlPath === '/api/kfc-users' && method === 'POST') {
    const id = `kfc-usr-${Date.now()}`;
    const item = { ...req.body, id, _id: id, active: true };
    memoryDB.kfcUsers.unshift(item);
    const { password, ...safe } = item;
    return res.status(201).json({ success: true, data: safe });
  }
  if (urlPath === '/api/kfc-users/login' && method === 'POST') {
    const { username, password } = req.body || {};
    const found = memoryDB.kfcUsers.find(
      u => u.username?.toLowerCase() === String(username || '').trim().toLowerCase()
    );
    if (!found || found.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid KFC Headquarters credentials.' });
    }
    if (!found.active) {
      return res.status(403).json({ success: false, error: 'Account suspended by HFA Admin.' });
    }
    const { password: _, ...safe } = found;
    return res.json({ success: true, data: { ...safe, portal: 'KFC_HQ', token: `hq_fallback_${Date.now()}` } });
  }

  return next();
}
