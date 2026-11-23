import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const user = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } });

    if (user && user.active !== false && user.password === password) {
      return res.json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          token: `kfc_jwt_${Date.now()}`
        }
      });
    }

    res.status(401).json({ success: false, error: 'Invalid username or password' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

