const { Router } = require('express');
const { randomBytes } = require('node:crypto');
const prisma = require('../lib/prisma');
const { signJwt } = require('../lib/auth');
const { verifyPassword } = require('../lib/password');
const { rateLimit } = require('../lib/rateLimit');
const { toId, toInt } = require('../lib/params');
const { startOfToday, pickupInstant } = require('../lib/time');
const jwt = require('jsonwebtoken');

const router = Router();
const categories = ['BAKERY', 'PREPARED', 'SUPERMARKET', 'CAFE', 'DESSERT', 'OTHER'];
const venueFields = { id: true, name: true, category: true, description: true, address: true, district: true, geo_lat: true, geo_lng: true, photo_url: true, contact_phone: true, commission_pct: true, is_active: true, is_approved: true, created_at: true };
const boxFields = { id: true, venue_id: true, title: true, type: true, description: true, items: true, original_price: true, price: true, qty_total: true, qty_left: true, pickup_start: true, pickup_end: true, pickup_date: true, photo_url: true, status: true, is_approved: true, created_at: true, venue: { select: { id: true, name: true } } };

async function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
  let payload;
  try { payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({ error: 'token_invalid' }); }
  if (payload.scope !== 'admin' || !Number.isSafeInteger(payload.userId)) return res.status(403).json({ error: 'admin_only' });
  const admin = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, username: true, role: true } });
  if (!admin || admin.role !== 'ADMIN') return res.status(403).json({ error: 'admin_only' });
  req.admin = admin;
  next();
}

router.post('/login', rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = req.body?.password;
  if (!/^[a-z0-9_]{3,40}$/.test(username) || typeof password !== 'string' || password.length > 128) return res.status(401).json({ error: 'credentials_invalid' });
  const admin = await prisma.user.findFirst({ where: { username, role: 'ADMIN' } });
  if (!admin || !verifyPassword(password, admin.password_hash)) return res.status(401).json({ error: 'credentials_invalid' });
  res.json({ token: signJwt({ userId: admin.id, scope: 'admin' }, '12h'), admin: { username: admin.username, name: admin.name } });
});

router.use(adminAuth);
router.get('/me', (req, res) => res.json({ username: req.admin.username }));
router.get('/overview', async (_req, res) => {
  const [users, venues, pendingVenues, boxes, pendingBoxes, orders] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }), prisma.venue.count(),
    prisma.venue.count({ where: { is_approved: false } }), prisma.box.count(),
    prisma.box.count({ where: { is_approved: false } }), prisma.order.count(),
  ]);
  res.json({ users, venues, pendingVenues, boxes, pendingBoxes, orders });
});
router.get('/users', async (req, res) => {
  const page = toInt(req.query.page ?? 1, { min: 1, max: 100000 }) ?? 1;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const where = { role: 'CUSTOMER', ...(q ? { OR: [{ public_id: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}) };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: { id: true, public_id: true, name: true, email: true, phone: true, created_at: true, _count: { select: { orders: true } } }, orderBy: { created_at: 'desc' }, skip: (page - 1) * 30, take: 30 }),
    prisma.user.count({ where }),
  ]);
  res.json({ items, total, page, pageSize: 30 });
});
router.get('/venues', async (_req, res) => {
  const items = await prisma.venue.findMany({ select: { ...venueFields, _count: { select: { boxes: true } } }, orderBy: { created_at: 'desc' }, take: 200 });
  res.json(items);
});
router.post('/venues', async (req, res) => {
  const b = req.body;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const address = typeof b.address === 'string' ? b.address.trim() : '';
  const phone = typeof b.contact_phone === 'string' ? b.contact_phone.trim() : '';
  const lat = Number(b.geo_lat); const lng = Number(b.geo_lng);
  const commission = toInt(b.commission_pct ?? 20, { min: 0, max: 100 });
  if (!name || name.length > 160 || !address || address.length > 300 || !phone || phone.length > 50 || !categories.includes(b.category) || !Number.isFinite(lat) || !Number.isFinite(lng) || commission === null) return res.status(400).json({ error: 'field_invalid' });
  if (lat < 50.95 || lat > 51.30 || lng < 71.20 || lng > 71.65) return res.status(400).json({ error: 'astana_only' });
  if (b.photo_url && (typeof b.photo_url !== 'string' || !/^https:\/\//.test(b.photo_url) || b.photo_url.length > 2000)) return res.status(400).json({ error: 'photo_invalid' });
  const access_code = randomBytes(8).toString('hex').toUpperCase();
  const venue = await prisma.venue.create({ data: { name, address, contact_phone: phone, category: b.category, geo_lat: lat, geo_lng: lng, description: typeof b.description === 'string' ? b.description.slice(0, 4000) : '', district: typeof b.district === 'string' ? b.district.slice(0, 160) : '', photo_url: b.photo_url || null, commission_pct: commission, is_active: false, is_approved: false, venue_token: randomBytes(32).toString('hex'), access_code }, select: venueFields });
  res.status(201).json({ venue, access_code });
});
router.patch('/venues/:id', async (req, res) => {
  const id = toId(req.params.id); if (!id) return res.status(404).json({ error: 'venue_not_found' });
  const b = req.body; const data = {};
  for (const key of ['is_active', 'is_approved']) if (b[key] !== undefined) { if (typeof b[key] !== 'boolean') return res.status(400).json({ error: 'field_invalid' }); data[key] = b[key]; }
  for (const key of ['name', 'address', 'contact_phone', 'description', 'district', 'photo_url']) if (b[key] !== undefined) { if (typeof b[key] !== 'string' || b[key].length > (key === 'description' ? 4000 : 2000)) return res.status(400).json({ error: 'field_invalid' }); data[key] = b[key]; }
  if (b.category !== undefined) { if (!categories.includes(b.category)) return res.status(400).json({ error: 'category_invalid' }); data.category = b.category; }
  if (b.commission_pct !== undefined) { data.commission_pct = toInt(b.commission_pct, { min: 0, max: 100 }); if (data.commission_pct === null) return res.status(400).json({ error: 'field_invalid' }); }
  if (!Object.keys(data).length) return res.status(400).json({ error: 'field_invalid' });
  const exists = await prisma.venue.findUnique({ where: { id }, select: { id: true } }); if (!exists) return res.status(404).json({ error: 'venue_not_found' });
  res.json(await prisma.venue.update({ where: { id }, data, select: venueFields }));
});
router.post('/venues/:id/code', rateLimit({ max: 10, key: (req) => req.admin.id }), async (req, res) => {
  const id = toId(req.params.id); if (!id) return res.status(404).json({ error: 'venue_not_found' });
  const access_code = randomBytes(8).toString('hex').toUpperCase();
  const venue = await prisma.venue.findUnique({ where: { id }, select: { id: true } }); if (!venue) return res.status(404).json({ error: 'venue_not_found' });
  await prisma.venue.update({ where: { id }, data: { access_code, venue_token: randomBytes(32).toString('hex') } });
  res.json({ access_code });
});
router.get('/boxes', async (req, res) => {
  const pending = req.query.pending === 'true';
  const items = await prisma.box.findMany({ where: pending ? { is_approved: false } : {}, select: boxFields, orderBy: { created_at: 'desc' }, take: 200 });
  res.json(items);
});
router.post('/boxes', async (req, res) => {
  const b = req.body; const venueId = toId(b.venue_id);
  const venue = venueId && await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } });
  if (!venue) return res.status(404).json({ error: 'venue_not_found' });
  const price = toInt(b.price, { min: 1, max: 10000000 }); const original = toInt(b.original_price, { min: 1, max: 10000000 }); const qty = toInt(b.qty, { min: 1, max: 1000 });
  const start = pickupInstant(startOfToday(), b.pickup_start); const end = pickupInstant(startOfToday(), b.pickup_end);
  if (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 160 || !['SURPRISE', 'ITEMIZED'].includes(b.type) || typeof b.description !== 'string' || !b.description.trim() || b.description.length > 4000 || price === null || original === null || price >= original || qty === null || !start || !end || end <= start || end <= new Date()) return res.status(400).json({ error: 'field_invalid' });
  if (b.photo_url && (typeof b.photo_url !== 'string' || !/^https:\/\//.test(b.photo_url) || b.photo_url.length > 2000)) return res.status(400).json({ error: 'photo_invalid' });
  const box = await prisma.box.create({ data: { venue_id: venueId, title: b.title.trim(), type: b.type, description: b.description, items: typeof b.items === 'string' ? b.items.slice(0, 4000) : null, price, original_price: original, qty_total: qty, qty_left: qty, pickup_start: b.pickup_start, pickup_end: b.pickup_end, pickup_date: startOfToday(), photo_url: b.photo_url || null, is_approved: true }, select: boxFields });
  res.status(201).json(box);
});
router.patch('/boxes/:id', async (req, res) => {
  const id = toId(req.params.id); if (!id) return res.status(404).json({ error: 'box_not_found' });
  const data = {};
  if (req.body.is_approved !== undefined) { if (typeof req.body.is_approved !== 'boolean') return res.status(400).json({ error: 'field_invalid' }); data.is_approved = req.body.is_approved; }
  if (req.body.status !== undefined) { if (!['ACTIVE', 'SOLD_OUT', 'EXPIRED'].includes(req.body.status)) return res.status(400).json({ error: 'status_invalid' }); data.status = req.body.status; }
  if (!Object.keys(data).length) return res.status(400).json({ error: 'field_invalid' });
  const box = await prisma.box.findUnique({ where: { id }, select: { id: true, qty_left: true, pickup_date: true, pickup_end: true } }); if (!box) return res.status(404).json({ error: 'box_not_found' });
  if (data.status === 'ACTIVE' && (box.qty_left < 1 || pickupInstant(box.pickup_date, box.pickup_end) <= new Date())) return res.status(409).json({ error: 'box_unavailable' });
  res.json(await prisma.box.update({ where: { id }, data, select: boxFields }));
});

module.exports = router;
