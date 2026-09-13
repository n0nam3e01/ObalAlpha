const { Router } = require('express');
const prisma = require('../lib/prisma');
const { signJwt } = require('../lib/auth');

const router = Router();

// POST /api/auth/phone — lightweight identity: name + phone → upsert User → JWT.
router.post('/phone', async (req, res) => {
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
