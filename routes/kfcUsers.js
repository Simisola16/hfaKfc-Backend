import express from 'express';
import KfcUser from '../models/KfcUser.js';
import { hashPassword, verifyPassword, createHqToken, requireHqAuth } from '../utils/hqAuth.js';

const router = express.Router();

// GET all KFC HQ users (HFA Admin portal directory, excludes password)
router.get('/', async (req, res) => {
  try {
    const users = await KfcUser.find({}, '-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create a new KFC HQ user (created exclusively from HFA Admin portal)
router.post('/', async (req, res) => {
  try {
    const { username, fullName, email, phone, role, password, createdBy } = req.body || {};
    if (!username?.trim() || !fullName?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Username, full name, and password are required.'
      });
    }
    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const existing = await KfcUser.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `KFC user "${username.trim()}" already exists.`
      });
    }

    const newUser = new KfcUser({
      username: username.trim(),
      fullName: fullName.trim(),
      email: (email || '').trim(),
      phone: (phone || '').trim(),
      role: role || 'KFC HQ Manager',
      password: hashPassword(password),
      active: true,
      createdBy: createdBy || 'HFA Admin'
    });

    await newUser.save();
    const safeUser = newUser.toObject();
    delete safeUser.password;

    res.status(201).json({ success: true, data: safeUser });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PATCH toggle active/suspended status (HFA Admin)
router.patch('/:id/toggle', async (req, res) => {
  try {
    const user = await KfcUser.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'KFC User not found' });
    user.active = !user.active;
    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ success: true, data: safeUser });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE remove a KFC HQ user (HFA Admin)
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await KfcUser.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'KFC User not found' });
    res.json({ success: true, message: 'KFC User removed' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST KFC Headquarters login — ONLY authenticates against KfcUser collection
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username?.trim() || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required.'
      });
    }

    const user = await KfcUser.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
    });

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid KFC Headquarters credentials.'
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: 'Your account is suspended. Please contact HFA Admin.'
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = createHqToken(user);
    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        portal: 'KFC_HQ',
        token
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET current authenticated KFC HQ session (validates Bearer token + active status)
router.get('/me', requireHqAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.hqUser._id,
      username: req.hqUser.username,
      fullName: req.hqUser.fullName,
      email: req.hqUser.email,
      phone: req.hqUser.phone,
      role: req.hqUser.role,
      department: req.hqUser.department,
      portal: 'KFC_HQ'
    }
  });
});

export default router;
