const { Router } = require('express');
const prisma = require('../lib/prisma');
const { startOfToday, endOfToday } = require('../lib/time');

const router = Router();

// ─────────────────────────────────────────────────────────────
// Auth: a venue presents X-Venue-Token on every request. The token
// is obtained once via POST /auth (magic-link key or 6-char code).
// ─────────────────────────────────────────────────────────────
async function venueAuth(req, res, next) {
  const token = req.headers['x-venue-token'];
  if (!token) return res.status(401).json({ error: 'venue_token_required' });

  const venue = await prisma.venue.findUnique({ where: { venue_token: token } });
  if (!venue) return res.status(401).json({ error: 'venue_token_invalid' });
  // Note: we intentionally do NOT block inactive venues here — a "closed"
  // venue still manages its panel; is_active only hides it from shoppers.

  req.venue = venue;
  next();
}

// Shared stats computation for a venue's "today".
async function computeTodayStats(venueId, commissionPct) {
  const today = startOfToday();
  const tomorrow = endOfToday();

  const [boxesPosted, qtyAgg, activeOrders, pickedAgg] = await Promise.all([
    prisma.box.count({ where: { venue_id: venueId, pickup_date: { gte: today, lt: tomorrow } } }),
    prisma.box.aggregate({
      where: { venue_id: venueId, pickup_date: { gte: today, lt: tomorrow } },
      _sum: { qty_total: true },
    }),
    prisma.order.aggregate({
      where: {
        box: { venue_id: venueId },
        status: { in: ['RESERVED', 'PAID', 'PICKED_UP'] },
        created_at: { gte: today, lt: tomorrow },
      },
      _count: true,
      _sum: { amount: true, qty: true },
    }),
    prisma.order.aggregate({
      where: {
        box: { venue_id: venueId },
        status: 'PICKED_UP',
        created_at: { gte: today, lt: tomorrow },
      },
      _count: true,
      _sum: { qty: true },
    }),
  ]);

  const grossRevenue = activeOrders._sum.amount ?? 0;
  const venueShare = Math.round(grossRevenue * (100 - commissionPct) / 100);

  return {
    boxes_posted: boxesPosted,
    qty_total: qtyAgg._sum.qty_total ?? 0,
    orders_sold: activeOrders._count ?? 0,
    qty_sold: activeOrders._sum.qty ?? 0,
    revenue: venueShare,           // venue's 85% share
    revenue_gross: grossRevenue,
    portions_saved: pickedAgg._sum.qty ?? 0,
    picked_up: pickedAgg._count ?? 0,
  };
}

// ── POST /venue/auth { code } — exchange a code/key for the venue token ──
router.post('/auth', async (req, res) => {
  const raw = (req.body?.code ?? '').toString().trim();
  if (!raw) return res.status(400).json({ error: 'code_required' });

  // A magic link may pass the whole URL or just the key; take the last token.
  const code = raw.includes('=') ? raw.split('=').pop().trim() : raw;
  const upper = code.toUpperCase();

  const venue = await prisma.venue.findFirst({
    where: { OR: [{ access_code: upper }, { venue_token: code }] },
  });
  if (!venue) return res.status(401).json({ error: 'invalid_code' });

  res.json({ token: venue.venue_token, venue });
});

// ── GET /venue/me — venue info + today's stats + last box + payout ──
router.get('/me', venueAuth, async (req, res) => {
  const stats = await computeTodayStats(req.venue.id, req.venue.commission_pct);
  const lastBox = await prisma.box.findFirst({
    where: { venue_id: req.venue.id },
    orderBy: { created_at: 'desc' },
  });
  res.json({ venue: req.venue, today_stats: stats, last_box: lastBox });
});

// ── PATCH /venue/me — settings + open/closed toggle ──
router.patch('/me', venueAuth, async (req, res) => {
  const b = req.body ?? {};
  const data = {};
  for (const f of ['name', 'address', 'contact_phone', 'kaspi_info', 'photo_url']) {
    if (b[f] !== undefined) data[f] = b[f];
  }
  if (b.category !== undefined) data.category = b.category;
  if (b.is_active !== undefined) data.is_active = !!b.is_active;
  if (b.default_pickup_start !== undefined) data.default_pickup_start = b.default_pickup_start || null;
  if (b.default_pickup_end !== undefined) data.default_pickup_end = b.default_pickup_end || null;

  const venue = await prisma.venue.update({ where: { id: req.venue.id }, data });
  res.json({ venue });
});

// ── GET /venue/payout — read-only weekly summary (last 7 days) ──
router.get('/payout', venueAuth, async (req, res) => {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);

  const agg = await prisma.order.aggregate({
    where: {
      box: { venue_id: req.venue.id },
      status: { in: ['PAID', 'PICKED_UP'] },
      created_at: { gte: since },
    },
    _sum: { amount: true },
    _count: true,
  });

  const turnover = agg._sum.amount ?? 0;
  const commission = Math.round(turnover * req.venue.commission_pct / 100);
  res.json({
    turnover,
    venue_share: turnover - commission,
    commission,
    commission_pct: req.venue.commission_pct,
    orders: agg._count ?? 0,
  });
});

// ── POST /venue/boxes — create a box ──
router.post('/boxes', venueAuth, async (req, res) => {
  const { title, type, description, items, price, original_price, qty, pickup_start, pickup_end, photo_url, category } = req.body;

  if (!title || !type || !price || !original_price || !qty || !pickup_start || !pickup_end) {
    return res.status(400).json({ error: 'missing_required_fields' });
  }
  if (parseInt(price) >= parseInt(original_price)) {
    return res.status(400).json({ error: 'price_must_be_less_than_original' });
  }
  if (parseInt(qty) < 1) {
    return res.status(400).json({ error: 'qty_must_be_positive' });
  }
  if (pickup_end <= pickup_start) {
    return res.status(400).json({ error: 'pickup_end_must_be_after_start' });
  }

  const box = await prisma.box.create({
    data: {
      venue_id: req.venue.id,
      title,
      type,
      description: description ?? '',
      items: items ?? null,
      original_price: parseInt(original_price),
      price: parseInt(price),
      qty_total: parseInt(qty),
      qty_left: parseInt(qty),
      pickup_start,
      pickup_end,
      pickup_date: startOfToday(),
      photo_url: photo_url ?? null,
      status: 'ACTIVE',
    },
  });

  // Optionally persist a new venue category if the box changed it.
  if (category && category !== req.venue.category) {
    await prisma.venue.update({ where: { id: req.venue.id }, data: { category } }).catch(() => {});
  }

  res.status(201).json(box);
});

// ── PATCH /venue/boxes/:id — qty / price / window / status edits ──
router.patch('/boxes/:id', venueAuth, async (req, res) => {
  const box = await prisma.box.findFirst({ where: { id: parseInt(req.params.id), venue_id: req.venue.id } });
  if (!box) return res.status(404).json({ error: 'box_not_found' });

  const { qty_left, price, original_price, title, pickup_start, pickup_end, status } = req.body;
  const data = {};
  if (qty_left !== undefined) data.qty_left = Math.max(0, parseInt(qty_left));
  if (price !== undefined) data.price = parseInt(price);
  if (original_price !== undefined) data.original_price = parseInt(original_price);
  if (title !== undefined) data.title = title;
  if (pickup_start) data.pickup_start = pickup_start;
  if (pickup_end) data.pickup_end = pickup_end;
  // SOLD_OUT = sold out; EXPIRED = unpublished (hidden from shoppers); ACTIVE = re-list.
  if (['ACTIVE', 'SOLD_OUT', 'EXPIRED'].includes(status)) data.status = status;

  const updated = await prisma.box.update({ where: { id: box.id }, data });
  res.json(updated);
});

// ── GET /venue/boxes — today's boxes ──
router.get('/boxes', venueAuth, async (req, res) => {
  const today = startOfToday();
  const tomorrow = endOfToday();

  const boxes = await prisma.box.findMany({
    where: { venue_id: req.venue.id, pickup_date: { gte: today, lt: tomorrow } },
    include: { _count: { select: { orders: { where: { status: { in: ['RESERVED', 'PAID', 'PICKED_UP'] } } } } } },
    orderBy: { created_at: 'desc' },
  });

  res.json(boxes);
});

// ── GET /venue/boxes/last — most recent box (any day) for "repeat yesterday" ──
router.get('/boxes/last', venueAuth, async (req, res) => {
  const box = await prisma.box.findFirst({
    where: { venue_id: req.venue.id },
    orderBy: { created_at: 'desc' },
  });
  if (!box) return res.status(404).json({ error: 'no_previous_box' });
  res.json(box);
});

// ── GET /venue/orders — today's orders ──
router.get('/orders', venueAuth, async (req, res) => {
  const today = startOfToday();
  const tomorrow = endOfToday();

  const orders = await prisma.order.findMany({
    where: {
      box: { venue_id: req.venue.id },
      created_at: { gte: today, lt: tomorrow },
    },
    include: {
      user: { select: { id: true, display_name: true, name: true, phone: true } },
      box: { select: { id: true, title: true, type: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  res.json(orders);
});

// Shared pickup logic: mark an order PICKED_UP + credit the buyer's impact.
async function doPickup(order) {
  const savings = order.box.original_price * order.qty - order.amount;
  const ops = [prisma.order.update({ where: { id: order.id }, data: { status: 'PICKED_UP' } })];
  if (order.user_id) {
    ops.push(prisma.user.update({
      where: { id: order.user_id },
      data: { boxes_saved: { increment: order.qty }, money_saved: { increment: savings } },
    }));
  }
  await prisma.$transaction(ops, { timeout: 15000 });
}

// ── POST /venue/pickup { code } — counter flow: match code, no order id needed ──
router.post('/pickup', venueAuth, async (req, res) => {
  const code = (req.body?.code ?? '').toString().trim();
  if (!code) return res.status(400).json({ error: 'code_required' });

  const order = await prisma.order.findFirst({
    where: {
      box: { venue_id: req.venue.id },
      pickup_code: code,
      status: { in: ['RESERVED', 'PAID'] },
    },
    include: { box: true, user: true },
  });
  if (!order) return res.status(404).json({ error: 'code_not_found' });

  await doPickup(order);
  res.json({ ok: true, order_id: order.id, buyer: order.user?.display_name ?? order.user?.name ?? null, box: order.box.title });
});

// ── POST /venue/orders/:id/pickup — per-row issue (kept for inline action) ──
router.post('/orders/:id/pickup', venueAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code_required' });

  const order = await prisma.order.findFirst({
    where: { id: parseInt(req.params.id), box: { venue_id: req.venue.id } },
    include: { box: true, user: true },
  });
  if (!order) return res.status(404).json({ error: 'order_not_found' });
  if (order.status !== 'RESERVED' && order.status !== 'PAID') {
    return res.status(400).json({ error: 'order_not_active' });
  }
  if (order.pickup_code !== code) {
    return res.status(400).json({ error: 'code_incorrect' });
  }

  await doPickup(order);
  res.json({ ok: true, order_id: order.id });
});

module.exports = router;
