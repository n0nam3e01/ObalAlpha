const { Router } = require('express');
const prisma = require('../lib/prisma');
const { startOfToday, endOfToday } = require('../lib/time');
const { toId } = require('../lib/params');

const router = Router();

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function discountPct(original, price) {
  // Guard a zero/absent original price — it would yield Infinity or NaN and
  // render as "−Infinity%" on the card.
  if (!original || original <= 0 || price >= original) return 0;
  return Math.round((1 - price / original) * 100);
}

router.get('/', async (req, res) => {
  const { category, q, sort, lat, lng } = req.query;

  const today = startOfToday();
  const tomorrow = endOfToday();

  const where = {
    status: 'ACTIVE',
    qty_left: { gt: 0 },
    pickup_date: { gte: today, lt: tomorrow },
    venue: { is_active: true },
  };

  if (process.env.DEBUG_BOXES === 'true') {
    console.log('[boxes] now=%s range=[%s, %s) category=%s q=%s',
      new Date().toISOString(), today.toISOString(), tomorrow.toISOString(), category ?? '-', q ?? '-');
  }

  if (category && category !== 'ALL') where.venue = { ...where.venue, category };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { venue: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  let boxes = await prisma.box.findMany({
    where,
    include: {
      venue: { select: { id: true, name: true, category: true, address: true, district: true, geo_lat: true, geo_lng: true, photo_url: true, rating_avg: true, rating_count: true } },
    },
  });

  // Number.isFinite, not truthiness: latitude 0 is a real coordinate.
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const hasGeo = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
  const userLat = hasGeo ? parsedLat : null;
  const userLng = hasGeo ? parsedLng : null;

  boxes = boxes.map((b) => ({
    ...b,
    discount_pct: discountPct(b.original_price, b.price),
    distance_km:
      hasGeo && Number.isFinite(b.venue.geo_lat) && Number.isFinite(b.venue.geo_lng)
        ? Math.round(haversineKm(userLat, userLng, b.venue.geo_lat, b.venue.geo_lng) * 10) / 10
        : null,
  }));

  if (sort === 'ending') {
    boxes.sort((a, b) => a.pickup_end.localeCompare(b.pickup_end));
  } else if (sort === 'cheapest') {
    boxes.sort((a, b) => a.price - b.price);
  } else if (sort === 'nearby' && hasGeo) {
    boxes.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
  }

  res.json(boxes);
});

router.get('/:id', async (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(404).json({ error: 'box_not_found' });

  const box = await prisma.box.findUnique({
    where: { id },
    include: {
      venue: true,
    },
  });
  if (!box) return res.status(404).json({ error: 'box_not_found' });

  res.json({ ...box, discount_pct: discountPct(box.original_price, box.price) });
});

module.exports = router;
