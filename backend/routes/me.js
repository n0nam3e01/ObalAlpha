const { Router } = require('express');
const prisma = require('../lib/prisma');
const { jwtMiddleware } = require('../lib/auth');

const router = Router();

function publicUser(user, favoritesCount) {
  return {
    id: user.id,
    public_id: user.public_id,
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
  if (display_name !== undefined && (typeof display_name !== 'string' || !display_name.trim() || display_name.trim().length > 100)) return res.status(400).json({ error: 'name_invalid' });
  if (avatar_preset !== undefined && (typeof avatar_preset !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(avatar_preset))) return res.status(400).json({ error: 'avatar_invalid' });
  if (display_name !== undefined) data.display_name = display_name.trim();
  if (avatar_preset !== undefined) data.avatar_preset = avatar_preset;
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
