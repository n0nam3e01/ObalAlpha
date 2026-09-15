const { Router } = require('express');
const prisma = require('../lib/prisma');
const { jwtMiddleware } = require('../lib/auth');

const router = Router();

function publicUser(user, favoritesCount) {
  return {
    id: user.id,
    name: user.name,
    display_name: user.display_name ?? user.name,
    username: user.username,
    photo_url: user.photo_url,
    avatar_preset: user.avatar_preset,
    phone: user.phone,
    email: user.email,
    language: user.language,
    notifications: user.notifications,
    boxes_saved: user.boxes_saved,
    money_saved: user.money_saved,
    favorites_count: favoritesCount,
  };
}

router.get('/', jwtMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { _count: { select: { favorites: true } } },
  });
  if (!user) return res.status(404).json({ error: 'user_not_found' });

  res.json(publicUser(user, user._count.favorites));
});

router.patch('/', jwtMiddleware, async (req, res) => {
  const { display_name, avatar_preset, language, phone, notifications } = req.body;
  const data = {};
  // Login identifiers need a separate verified-change flow, not profile PATCH.
  if (phone !== undefined || req.body.email !== undefined) return res.status(400).json({ error: 'contact_change_unavailable' });
  if (typeof display_name === 'string' && display_name.trim()) data.display_name = display_name.trim();
  if (typeof avatar_preset === 'string') data.avatar_preset = avatar_preset;
  if (language && ['ru', 'kk'].includes(language)) data.language = language;
  if (typeof notifications === 'boolean') data.notifications = notifications;

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data,
    include: { _count: { select: { favorites: true } } },
  });

  res.json(publicUser(user, user._count.favorites));
});

module.exports = router;
