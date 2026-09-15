const { Router } = require('express');
const prisma = require('../lib/prisma');
const { jwtMiddleware } = require('../lib/auth');
const { toId } = require('../lib/params');
const publicVenue = require('../lib/publicVenue');

const router = Router();

router.get('/', jwtMiddleware, async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { user_id: req.user.userId },
    include: {
      venue: {
        select: {
          ...publicVenue,
          _count: { select: { boxes: { where: { status: 'ACTIVE', qty_left: { gt: 0 } } } } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  res.json(
    favorites.map((f) => ({
      id: f.id,
      venue: { ...f.venue, active_boxes_count: f.venue._count.boxes },
    }))
  );
});

router.post('/:venueId', jwtMiddleware, async (req, res) => {
  const venueId = toId(req.params.venueId);
  if (!venueId) return res.status(404).json({ error: 'venue_not_found' });

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) return res.status(404).json({ error: 'venue_not_found' });

  const fav = await prisma.favorite.upsert({
    where: { user_id_venue_id: { user_id: req.user.userId, venue_id: venueId } },
    update: {},
    create: { user_id: req.user.userId, venue_id: venueId },
  });

  res.status(201).json(fav);
});

router.delete('/:venueId', jwtMiddleware, async (req, res) => {
  const venueId = toId(req.params.venueId);
  if (!venueId) return res.json({ ok: true });

  await prisma.favorite.deleteMany({
    where: { user_id: req.user.userId, venue_id: venueId },
  });
  res.json({ ok: true });
});

module.exports = router;
