const { Router } = require('express');
const prisma = require('../lib/prisma');
const { jwtMiddleware } = require('../lib/auth');

const router = Router();

router.post('/', jwtMiddleware, async (req, res) => {
  const { order_id, stars, comment } = req.body;
  if (!order_id || !stars) return res.status(400).json({ error: 'order_id_and_stars_required' });
  if (stars < 1 || stars > 5) return res.status(400).json({ error: 'stars_must_be_1_to_5' });

  const order = await prisma.order.findFirst({
    where: { id: parseInt(order_id), user_id: req.user.userId, status: 'PICKED_UP' },
    include: { box: true },
  });
  if (!order) return res.status(403).json({ error: 'order_not_eligible' });

  const existing = await prisma.rating.findUnique({ where: { order_id: order.id } });
  if (existing) return res.status(409).json({ error: 'already_rated' });

  const rating = await prisma.rating.create({
    data: {
      user_id: req.user.userId,
      order_id: order.id,
      venue_id: order.box.venue_id,
      stars: parseInt(stars),
      comment: comment ?? null,
    },
  });

  // Recalculate venue rating
  const agg = await prisma.rating.aggregate({
    where: { venue_id: order.box.venue_id },
    _avg: { stars: true },
    _count: { stars: true },
  });
  await prisma.venue.update({
    where: { id: order.box.venue_id },
    data: {
      rating_avg: Math.round((agg._avg.stars ?? 0) * 10) / 10,
      rating_count: agg._count.stars,
    },
  });

  res.status(201).json(rating);
});

module.exports = router;
