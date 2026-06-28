import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'copytrader-dev-secret-change-in-prod';
const INVITE_CODES = (process.env.INVITE_CODES || 'COPY2024,TRADER99,INVITE01').split(',');

// ── Simple JWT (no external deps) ────────────────────────────────────────────
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function signJwt(payload) {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const body   = b64url({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 60*60*24*30 });
  const sig    = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}
export function verifyJwt(token) {
  if (!token) return null;
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}

// ── In-memory user store (persists across warm instances) ────────────────────
if (!global._users) global._users = {};
const users = global._users;

function hashPassword(password) {
  return crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex');
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  // ── Register ──
  if (req.method === 'POST' && action === 'register') {
    const { username, password, inviteCode } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!INVITE_CODES.includes((inviteCode||'').trim().toUpperCase())) {
      return res.status(403).json({ error: 'Invalid invite code' });
    }
    if (users[username.toLowerCase()]) return res.status(409).json({ error: 'Username already taken' });
    
    users[username.toLowerCase()] = {
      username,
      password: hashPassword(password),
      createdAt: Date.now(),
      role: Object.keys(users).length === 0 ? 'admin' : 'user',
    };
    const token = signJwt({ username, role: users[username.toLowerCase()].role });
    return res.json({ token, username, role: users[username.toLowerCase()].role });
  }

  // ── Login ──
  if (req.method === 'POST' && action === 'login') {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = users[username.toLowerCase()];
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = signJwt({ username: user.username, role: user.role });
    return res.json({ token, username: user.username, role: user.role });
  }

  // ── Verify token ──
  if (req.method === 'GET' && action === 'verify') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payload = verifyJwt(token);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
    return res.json({ valid: true, username: payload.username, role: payload.role });
  }

  // ── List users (admin only) ──
  if (req.method === 'GET' && action === 'users') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payload = verifyJwt(token);
    if (!payload || payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    return res.json({ users: Object.values(users).map(u => ({ username: u.username, role: u.role, createdAt: u.createdAt })) });
  }

  res.status(404).json({ error: 'Unknown action' });
}
