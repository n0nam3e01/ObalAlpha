const { Router } = require('express');
const prisma = require('../lib/prisma');
const { signJwt, jwtMiddleware } = require('../lib/auth');
const { createCustomerSession, setRefreshCookie, readRefreshCookie, refreshHash, requireSessionOrigin } = require('../lib/customerSessions');
const { hashPassword, verifyPassword } = require('../lib/password');
const { rateLimit } = require('../lib/rateLimit');
const { randomBytes } = require('node:crypto');

const router = Router();
const authLimit = rateLimit({ windowMs: 60_000, max: 10 });
router.use(requireSessionOrigin);

const normalizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() || null : null;
const normalizePhone = (value) => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/[\s()+-]/g, '');
  return /^\d{10,15}$/.test(digits) ? '+' + digits : null;
};
const publicUser = (user) => ({
  id: user.id,
  public_id: user.public_id,
  name: user.name,
  display_name: user.display_name,
  email: user.email,
  phone: user.phone,
  avatar_preset: user.avatar_preset,
  language: user.language,
  notifications: user.notifications,
  boxes_saved: user.boxes_saved,
  money_saved: user.money_saved,
});

async function issueSession(user, res, status = 200) {
  const session = await createCustomerSession(user.id);
  setRefreshCookie(res, session.secret);
  res.status(status).json({ token: session.token, user: publicUser(user) });
}

router.post('/register', authLimit, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = normalizeEmail(req.body?.email);
  const phone = normalizePhone(req.body?.phone);
  const password = req.body?.password ?? '';

  if (!name || name.length > 100) return res.status(400).json({ error: 'name_required' });
  if (req.body.phone && !phone) return res.status(400).json({ error: 'phone_invalid' });
  if (!email && !phone) return res.status(400).json({ error: 'contact_required' });
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return res.status(400).json({ error: 'email_invalid' });
  if (phone && !/^\+?\d{10,15}$/.test(phone)) return res.status(400).json({ error: 'phone_invalid' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ error: 'password_invalid' });

  const contacts = [email && { email }, phone && { phone }].filter(Boolean);
  const existing = await prisma.user.findFirst({ where: { OR: contacts } });
  if (existing) return res.status(409).json({ error: 'account_exists' });

  const user = await prisma.user.create({
    data: { name, display_name: name, email, phone, public_id: 'OB-' + randomBytes(6).toString('hex').toUpperCase(), password_hash: hashPassword(password), language: 'ru' },
  });
  await issueSession(user, res, 201);
});

router.post('/login', authLimit, async (req, res) => {
  const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : '';
  const password = req.body?.password ?? '';
  if (!identifier || identifier.length > 254 || typeof password !== 'string' || !password || password.length > 128) return res.status(400).json({ error: 'credentials_required' });

  const email = identifier.includes('@') ? normalizeEmail(identifier) : null;
  const phone = email ? null : normalizePhone(identifier);
  if (!email && !phone) return res.status(401).json({ error: 'credentials_invalid' });
  const user = await prisma.user.findFirst({ where: email ? { email } : { phone } });
  if (!user || user.role !== 'CUSTOMER' || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'credentials_invalid' });
  }
  await issueSession(user, res);
});

router.post('/refresh', rateLimit({ max: 60 }), async (req, res) => {
  const secret = readRefreshCookie(req);
  const session = secret && await prisma.customerSession.findFirst({ where: {
    refresh_hash: refreshHash(secret), revoked_at: null, expires_at: { gt: new Date() }, user: { role: 'CUSTOMER' },
  }, include: { user: true } });
  // Never delete a cookie from a delayed rejection: another tab may have
  // completed a newer login by the time this response reaches the browser.
  if (!session) return res.status(401).json({ error: 'session_expired' });
  res.json({ token: signJwt({ userId: session.user_id, sid: session.id }), user: publicUser(session.user) });
});
router.post('/logout', jwtMiddleware, async (req, res) => {
  await prisma.customerSession.updateMany({ where: { id: req.user.sid, user_id: req.user.userId, revoked_at: null }, data: { revoked_at: new Date() } });
  res.json({ ok: true });
});
router.post('/logout-all', jwtMiddleware, async (req, res) => {
  await prisma.customerSession.updateMany({ where: { user_id: req.user.userId, revoked_at: null }, data: { revoked_at: new Date() } });
  res.json({ ok: true });
});

router.post('/phone', (_req, res) => res.status(410).json({ error: 'password_required' }));

module.exports = router;
