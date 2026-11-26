import crypto from 'crypto';
import KfcUser from '../models/KfcUser.js';

const TOKEN_SECRET = process.env.HQ_JWT_SECRET || 'hfa_kfc_hq_secure_token_secret_v1';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(plainPassword), salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(plainPassword, storedPassword) {
  if (!plainPassword || !storedPassword) return false;
  if (String(storedPassword).startsWith('scrypt:')) {
    const [, salt, hashHex] = String(storedPassword).split(':');
    if (!salt || !hashHex) return false;
    const derived = crypto.scryptSync(String(plainPassword), salt, 64);
    const storedBuf = Buffer.from(hashHex, 'hex');
    if (derived.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derived, storedBuf);
  }
  return String(plainPassword) === String(storedPassword);
}

export function createHqToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(user._id || user.id),
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      portal: 'KFC_HQ',
      iat: Date.now(),
      exp: Date.now() + TOKEN_TTL_MS
    })
  ).toString('base64url');

  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${sig}`;
}

export function verifyHqToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;

  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.portal !== 'KFC_HQ') return null;
    if (!decoded.exp || Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function requireHqAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const decoded = verifyHqToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Please sign in with a valid KFC Headquarters account.'
    });
  }

  try {
    const user = await KfcUser.findById(decoded.sub, '-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Account not found. Contact HFA Admin.'
      });
    }
    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: 'Your KFC Headquarters account has been suspended by HFA Admin.'
      });
    }
    req.hqUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
