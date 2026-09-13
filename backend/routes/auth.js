const { Router } = require('express');
const prisma = require('../lib/prisma');
const { signJwt } = require('../lib/auth');
const { rateLimit } = require('../lib/rateLimit');

const router = Router();

// POST /api/auth/phone — lightweight identity: name + phone → upsert User → JWT.
//
// SECURITY (v0 pilot): possession of a phone number is the only credential —
// there is no OTP, so anyone who submits a number gets that account's token.
// The rate limit slows enumeration but does not make this safe. See the
// "Аутентификация" section in CLAUDE.md before shipping this to real users.
router.post('/phone', rateLimit({ windowMs: 60_000, max: 8 }), async (req, res) => {
  const { name, phone } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name_required' });
  if (!phone?.trim()) return res.status(400).json({ error: 'phone_required' });

  const cleanPhone = phone.trim();
  const cleanName = name.trim();

  const user = await prisma.user.upsert({
    where: { phone: cleanPhone },
    update: { name: cleanName, display_name: cleanName },
    create: {
      name: cleanName,
      display_name: cleanName,
      phone: cleanPhone,
      language: 'ru',
    },
  });

  const token = signJwt({ userId: user.id });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      display_name: user.display_name,
      phone: user.phone,
      avatar_preset: user.avatar_preset,
      language: user.language,
      notifications: user.notifications,
      boxes_saved: user.boxes_saved,
      money_saved: user.money_saved,
    },
  });
});

module.exports = router;
