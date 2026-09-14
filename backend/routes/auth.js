const { Router } = require('express');
const prisma = require('../lib/prisma');
const { signJwt } = require('../lib/auth');
const { hashPassword, verifyPassword } = require('../lib/password');
const { rateLimit } = require('../lib/rateLimit');

const router = Router();
const authLimit = rateLimit({ windowMs: 60_000, max: 10 });

const normalizeEmail = (value) => value?.trim().toLowerCase() || null;
const normalizePhone = (value) => value?.replace(/[^\d+]/g, '') || null;
const publicUser = (user) => ({
  id: user.id,
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

function issueSession(user, res, status = 200) {
  res.status(status).json({ token: signJwt({ userId: user.id }), user: publicUser(user) });
}

router.post('/register', authLimit, async (req, res) => {
  const name = req.body?.name?.trim();
  const email = normalizeEmail(req.body?.email);
  const phone = normalizePhone(req.body?.phone);
  const password = req.body?.password ?? '';

  if (!name) return res.status(400).json({ error: 'name_required' });
  if (!email && !phone) return res.status(400).json({ error: 'contact_required' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'email_invalid' });
  if (phone && !/^\+?\d{10,15}$/.test(phone)) return res.status(400).json({ error: 'phone_invalid' });
  if (password.length < 8) return res.status(400).json({ error: 'password_short' });

  const contacts = [email && { email }, phone && { phone }].filter(Boolean);
  const existing = await prisma.user.findFirst({ where: { OR: contacts } });
  if (existing) return res.status(409).json({ error: 'account_exists' });

  const user = await prisma.user.create({
    data: { name, display_name: name, email, phone, password_hash: hashPassword(password), language: 'ru' },
  });
  issueSession(user, res, 201);
});

router.post('/login', authLimit, async (req, res) => {
  const identifier = req.body?.identifier?.trim();
  const password = req.body?.password ?? '';
  if (!identifier || !password) return res.status(400).json({ error: 'credentials_required' });

  const email = identifier.includes('@') ? normalizeEmail(identifier) : null;
  const phone = email ? null : normalizePhone(identifier);
  const user = await prisma.user.findFirst({ where: email ? { email } : { phone } });
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'credentials_invalid' });
  }
  issueSession(user, res);
});

router.post('/phone', (_req, res) => res.status(410).json({ error: 'password_required' }));

module.exports = router;
