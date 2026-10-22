const { randomBytes, createHash } = require('node:crypto');
const COOKIE_NAME = 'obal_refresh';
const LIFETIME_MS = 7 * 86400000;
const refreshHash = (secret) => createHash('sha256').update(secret).digest('hex');

function cookieOptions(config = process.env) {
  const production = config.NODE_ENV === 'production';
  return { httpOnly: true, secure: production, sameSite: production && config.SESSION_SAME_SITE === 'none' ? 'none' : 'lax', path: '/api/auth', maxAge: LIFETIME_MS };
}
function readRefreshCookie(req) {
  const parts = (req.headers.cookie || '').split(';').map((part) => part.trim());
  const value = parts.find((part) => part.startsWith(COOKIE_NAME + '='))?.slice(COOKIE_NAME.length + 1);
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
function requireSessionOrigin(req, res, next) {
  const origin = req.get('Origin');
  const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((item) => item.trim());
  if ((origin && !allowed.includes(origin)) || (!origin && req.get('Sec-Fetch-Site') === 'cross-site')) {
    return res.status(403).json({ error: 'origin_forbidden' });
  }
  next();
}
async function createCustomerSession(userId) {
  const secret = randomBytes(32).toString('hex');
  const session = await require('./prisma').customerSession.create({ data: {
    user_id: userId, refresh_hash: refreshHash(secret), expires_at: new Date(Date.now() + LIFETIME_MS),
  } });
  return { token: require('./auth').signJwt({ userId, sid: session.id }), secret };
}
function setRefreshCookie(res, secret) { res.cookie(COOKIE_NAME, secret, cookieOptions()); }
module.exports = { refreshHash, cookieOptions, readRefreshCookie, requireSessionOrigin, createCustomerSession, setRefreshCookie };
