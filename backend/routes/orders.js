const { Router } = require('express');
const { randomBytes } = require('crypto');
const prisma = require('../lib/prisma');
const { jwtMiddleware } = require('../lib/auth');
const { toId, toInt } = require('../lib/params');
const { pickupInstant, startOfToday } = require('../lib/time');
const { cancelOrder } = require('../lib/orderTransitions');
const publicVenue = require('../lib/publicVenue');
const { rateLimit } = require('../lib/rateLimit');
const router = Router();
const include = { box: { include: { venue: { select: publicVenue } } } };

router.post('/', jwtMiddleware, rateLimit({ max: 20, key: (req) => req.user.userId }), async (req, res) => {
  const { box_id, qty = 1, fulfillment = 'PICKUP' } = req.body;
  const boxId = toId(box_id);
  const quantity = toInt(qty, { min: 1, max: 3 });
  if (!boxId) return res.status(400).json({ error: 'box_id_required' });
  if (quantity === null) return res.status(400).json({ error: 'qty_invalid' });
  if (fulfillment !== 'PICKUP') return res.status(400).json({ error: 'pickup_only' });
  const me = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!me) return res.status(401).json({ error: 'unauthorized' });

  const order = await prisma.$transaction(async (tx) => {
    // Lock before reading price/window/stock; last-portion bookings serialize.
    await tx.$queryRaw`SELECT id FROM "Box" WHERE id = ${boxId} FOR UPDATE`;
    const box = await tx.box.findFirst({
      where: { id: boxId, status: 'ACTIVE', qty_left: { gte: quantity },
        pickup_date: startOfToday(), venue: { is_active: true } },
      include: { venue: { select: { commission_pct: true } } },
    });
    const until = box && pickupInstant(box.pickup_date, box.pickup_end);
    if (!box || !until || until <= new Date()) throw Object.assign(new Error('sold_out'), { status: 409 });
    await tx.box.update({ where: { id: box.id }, data: {
      qty_left: { decrement: quantity }, status: box.qty_left === quantity ? 'SOLD_OUT' : 'ACTIVE',
    } });
    const amount = box.price * quantity;
    return tx.order.create({ data: {
      user_id: me.id, box_id: box.id, qty: quantity, amount,
      commission: Math.round(amount * box.venue.commission_pct / 100),
      service_fee: 0, delivery_fee: 0, fulfillment: 'PICKUP',
      pickup_code: randomBytes(6).toString('hex').toUpperCase(),
      reserved_until: until, customer_name: me.display_name || me.name, customer_phone: me.phone,
    }, include });
  });
  res.status(201).json(order);
});

router.get('/', jwtMiddleware, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { user_id: req.user.userId }, include, orderBy: { created_at: 'desc' },
  });
  res.json({ active: orders.filter((o) => ['RESERVED', 'PAID'].includes(o.status)),
    past: orders.filter((o) => !['RESERVED', 'PAID'].includes(o.status)) });
});

router.get('/:id', jwtMiddleware, async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(404).json({ error: 'order_not_found' });
  const order = await prisma.order.findFirst({
    where: { id, user_id: req.user.userId }, include: { ...include, rating: true },
  });
  if (!order) return res.status(404).json({ error: 'order_not_found' });
  res.json(order);
});

router.post('/:id/cancel', jwtMiddleware, async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(404).json({ error: 'order_not_found' });
  await cancelOrder(id, req.user.userId);
  res.json({ ok: true });
});
module.exports = router;
