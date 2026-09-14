const { Router } = require('express');
const prisma = require('../lib/prisma');
const { jwtMiddleware } = require('../lib/auth');
const { toId } = require('../lib/params');

const router = Router();

function generatePickupCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// POST /api/orders — reserve a box (atomic qty decrement).
router.post('/', jwtMiddleware, async (req, res) => {
  const { box_id, qty = 1, fulfillment = 'PICKUP', delivery_address } = req.body;

  // parseInt('abc') is NaN, and every NaN comparison is false — so a bare
  // range check would let garbage through into the query. Test the number.
  const parsedBoxId = parseInt(box_id, 10);
  if (!Number.isInteger(parsedBoxId) || parsedBoxId < 1) {
    return res.status(400).json({ error: 'box_id_required' });
  }

  const parsedQty = parseInt(qty, 10);
  if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 3) {
    return res.status(400).json({ error: 'qty_invalid' });
  }
  if (!['PICKUP', 'DELIVERY'].includes(fulfillment)) {
    return res.status(400).json({ error: 'fulfillment_invalid' });
  }
  if (fulfillment === 'DELIVERY' && !delivery_address?.trim()) {
    return res.status(400).json({ error: 'delivery_address_required' });
  }

  try {
    // Snapshot the buyer's contact info outside the transaction to keep the
    // critical section (stock check + decrement + create) small and fast.
    const me = await prisma.user.findUnique({ where: { id: req.user.userId } });

    const order = await prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: { id: parsedBoxId, status: 'ACTIVE', qty_left: { gte: parsedQty } },
        include: { venue: { select: { commission_pct: true } } },
      });
      if (!box) throw Object.assign(new Error('sold_out'), { code: 'SOLD_OUT' });

      await tx.box.update({
        where: { id: box.id },
        data: {
          qty_left: { decrement: parsedQty },
          status: box.qty_left - parsedQty === 0 ? 'SOLD_OUT' : 'ACTIVE',
        },
      });

      const commission = Math.round((box.price * parsedQty * box.venue.commission_pct) / 100);
      const amount = box.price * parsedQty;
      const serviceFee = Math.max(99, Math.round(amount * 0.07));
      const deliveryFee = fulfillment === 'DELIVERY' ? Number(process.env.DELIVERY_FEE ?? 790) : 0;

      const [endH, endM] = box.pickup_end.split(':').map(Number);
      const reservedUntil = new Date(box.pickup_date);
      reservedUntil.setHours(endH, endM, 0, 0);

      return tx.order.create({
        data: {
          user_id: req.user.userId,
          box_id: box.id,
          qty: parsedQty,
          amount,
          commission,
          service_fee: serviceFee,
          delivery_fee: deliveryFee,
          fulfillment,
          delivery_address: fulfillment === 'DELIVERY' ? delivery_address.trim() : null,
          status: 'RESERVED',
          pickup_code: generatePickupCode(),
          reserved_until: reservedUntil,
          customer_name: me?.display_name ?? me?.name ?? null,
          customer_phone: me?.phone ?? null,
        },
        include: { box: { include: { venue: true } } },
      });
    }, { timeout: 15000 });

    res.status(201).json(order);
  } catch (err) {
    if (err.code === 'SOLD_OUT') return res.status(409).json({ error: 'sold_out' });
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/orders — current user's orders, split active/past.
router.get('/', jwtMiddleware, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { user_id: req.user.userId },
    include: { box: { include: { venue: { select: { id: true, name: true, address: true, photo_url: true } } } } },
    orderBy: { created_at: 'desc' },
  });

  const active = orders.filter((o) => ['RESERVED', 'PAID'].includes(o.status));
  const past = orders.filter((o) => !['RESERVED', 'PAID'].includes(o.status));

  res.json({ active, past });
});

// GET /api/orders/:id — one order (must belong to the user).
router.get('/:id', jwtMiddleware, async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(404).json({ error: 'order_not_found' });

  const order = await prisma.order.findFirst({
    where: { id, user_id: req.user.userId },
    include: { box: { include: { venue: true } }, rating: true },
  });
  if (!order) return res.status(404).json({ error: 'order_not_found' });
  res.json(order);
});

// POST /api/orders/:id/cancel — cancel a reservation and restore stock.
router.post('/:id/cancel', jwtMiddleware, async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(404).json({ error: 'order_not_found' });

  const order = await prisma.order.findFirst({
    where: { id, user_id: req.user.userId },
    include: { box: { select: { status: true } } },
  });
  if (!order) return res.status(404).json({ error: 'order_not_found' });
  if (order.status !== 'RESERVED') return res.status(400).json({ error: 'cannot_cancel' });

  // Returning stock re-opens a box that sold out, but must not resurrect one
  // whose pickup window already closed — that box stays EXPIRED.
  const boxData = { qty_left: { increment: order.qty } };
  if (order.box.status === 'SOLD_OUT') boxData.status = 'ACTIVE';

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } }),
    prisma.box.update({ where: { id: order.box_id }, data: boxData }),
  ], { timeout: 15000 });

  res.json({ ok: true });
});

module.exports = router;
