const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

test('PostgreSQL: registration, stock races, cancellation, pickup and isolation', {
  skip: !process.env.TEST_DATABASE_URL,
}, async (t) => {
  const url = new URL(process.env.TEST_DATABASE_URL);
  // Refuse any database not explicitly dedicated to tests.
  assert.match(url.pathname, /^\/obal_test(?:_\w+)?$/);
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
  process.env.JWT_SECRET = 'test-only-' + randomUUID();
  const prisma = require('../lib/prisma');
  const app = require('../server');
  const { startOfToday, pickupInstant } = require('../lib/time');
  const { expireBoxesAndCancelOrders } = require('../lib/cron');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  const key = randomUUID();
  const userIds = [];
  const venueIds = [];
  async function api(path, { method = 'GET', token, venueToken, body } = {}) {
    const response = await fetch(base + path, { method, headers: {
      'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(venueToken ? { 'X-Venue-Token': venueToken } : {}),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
  }
  function noSecrets(value) {
    const text = JSON.stringify(value);
    for (const field of ['venue_token', 'access_code', 'payout_details', 'password_hash', 'kaspi_info']) assert.ok(!text.includes('"' + field + '"'), field);
  }
  try {
    const credentials = { name: 'Тест Әли', email: key + '@example.test', password: 'correct-password-123' };
    const registration = await api('/auth/register', { method: 'POST', body: credentials });
    assert.equal(registration.status, 201);
    const buyer = registration.data;
    userIds.push(buyer.user.id);
    assert.match(buyer.user.public_id, /^OB-[A-F0-9]{12}$/);
    noSecrets(buyer);
    assert.equal((await api('/auth/register', { method: 'POST', body: credentials })).status, 409);
    assert.equal((await api('/auth/login', { method: 'POST', body: { identifier: credentials.email, password: credentials.password } })).status, 200);
    assert.equal((await api('/auth/login', { method: 'POST', body: { identifier: credentials.email, password: 'wrong' } })).status, 401);
    assert.equal((await api('/auth/register', { method: 'POST', body: { name: {}, password: [] } })).status, 400);
    const other = await prisma.user.create({ data: { name: 'Other ' + key } });
    userIds.push(other.id);
    const otherToken = require('../lib/auth').signJwt({ userId: other.id });
    const { hashPassword } = require('../lib/password');
    const admin = await prisma.user.create({ data: { name: 'Test Admin', username: 'test_' + key.replaceAll('-', '').slice(0, 20), role: 'ADMIN', password_hash: hashPassword('admin-test-password-123') } });
    userIds.push(admin.id);
    const adminLogin = await api('/admin/login', { method: 'POST', body: { username: admin.username, password: 'admin-test-password-123' } });
    assert.equal(adminLogin.status, 200);
    const adminToken = adminLogin.data.token;
    assert.equal((await api('/admin/overview', { token: buyer.token })).status, 403);
    assert.equal((await api('/admin/overview', { token: adminToken })).status, 200);
    assert.equal((await api('/orders', { token: adminToken })).status, 403);
    const users = await api('/admin/users', { token: adminToken });
    assert.equal(users.status, 200);
    assert.ok(users.data.items.some((u) => u.public_id === buyer.user.public_id));
    noSecrets(users.data);
    const adminVenue = await api('/admin/venues', { method: 'POST', token: adminToken, body: { name: 'Test Admin Venue', category: 'BAKERY', address: 'Астана, тест 1', contact_phone: '+77000000000', geo_lat: 51.16, geo_lng: 71.43 } });
    assert.equal(adminVenue.status, 201, JSON.stringify(adminVenue));
    venueIds.push(adminVenue.data.venue.id);
    assert.equal(adminVenue.data.venue.is_approved, false);
    assert.equal((await api('/admin/venues', { token: adminToken })).status, 200);
    noSecrets((await api('/admin/venues', { token: adminToken })).data);
    const initialCode = adminVenue.data.access_code;
    assert.equal((await api('/venue/auth', { method: 'POST', body: { code: initialCode } })).status, 200);
    const rotated = await api('/admin/venues/' + adminVenue.data.venue.id + '/code', { method: 'POST', token: adminToken, body: {} });
    assert.equal(rotated.status, 200);
    assert.notEqual(rotated.data.access_code, initialCode);
    assert.equal((await api('/venue/auth', { method: 'POST', body: { code: initialCode } })).status, 401);
    assert.equal((await api('/venue/auth', { method: 'POST', body: { code: rotated.data.access_code } })).status, 200);
    assert.equal((await api('/admin/venues/' + adminVenue.data.venue.id, { method: 'PATCH', token: adminToken, body: { is_approved: true, is_active: true } })).status, 200);
    assert.equal((await api('/admin/venues', { method: 'POST', token: adminToken, body: { name: 'Wrong city', category: 'BAKERY', address: 'Алматы', contact_phone: '+77000000000', geo_lat: 43.2, geo_lng: 76.9 } })).status, 400);
    async function venue(suffix) {
      const row = await prisma.venue.create({ data: {
        name: 'Test ' + suffix, category: 'BAKERY', address: 'Test address', geo_lat: 51.1, geo_lng: 71.4,
        contact_phone: '+77000000000', venue_token: key + suffix, access_code: (key + suffix).toUpperCase(),
        payout_details: 'PRIVATE', commission_pct: 10,
      } });
      venueIds.push(row.id); return row;
    }
    const shop = await venue('A');
    const otherShop = await venue('B');
    const offer = { title: 'Тестовый набор', description: 'Только для теста', type: 'SURPRISE', price: 1000, original_price: 2000, qty: 1, pickup_start: '00:00', pickup_end: '23:59' };
    const adminBox = await api('/admin/boxes', { method: 'POST', token: adminToken, body: { ...offer, venue_id: adminVenue.data.venue.id } });
    assert.equal(adminBox.status, 201, JSON.stringify(adminBox));
    assert.equal(adminBox.data.is_approved, true);
    assert.equal((await api('/boxes/' + adminBox.data.id)).status, 200);
    const created = await api('/venue/boxes', { method: 'POST', venueToken: shop.venue_token, body: offer });
    assert.equal(created.status, 201, JSON.stringify(created));
    const box = created.data;
    assert.equal(box.is_approved, false);
    assert.equal((await api('/boxes/' + box.id)).status, 404);
    assert.equal((await api('/orders', { method: 'POST', token: buyer.token, body: { box_id: box.id } })).status, 409);
    assert.equal((await api('/admin/boxes/' + box.id, { method: 'PATCH', token: adminToken, body: { is_approved: true } })).status, 200);
    assert.equal((await api('/venue/boxes', { method: 'POST', venueToken: shop.venue_token, body: { ...offer, pickup_end: '99:00' } })).status, 400);
    noSecrets((await api('/boxes/' + box.id)).data);
    noSecrets((await api('/boxes')).data);
    await api('/favorites/' + shop.id, { method: 'POST', token: buyer.token, body: {} });
    noSecrets((await api('/favorites', { token: buyer.token })).data);
    assert.equal((await api('/orders', { method: 'POST', body: { box_id: box.id } })).status, 401);
    assert.equal((await api('/orders', { method: 'POST', token: buyer.token, body: { box_id: box.id, qty: '1x' } })).status, 400);
    assert.equal((await api('/orders', { method: 'POST', token: buyer.token, body: { box_id: box.id, fulfillment: 'DELIVERY' } })).status, 400);
    const book = () => api('/orders', { method: 'POST', token: buyer.token, body: { box_id: box.id } });
    const attempts = await Promise.all([book(), book()]);
    assert.deepEqual(attempts.map((r) => r.status).sort(), [201, 409]);
    const first = attempts.find((r) => r.status === 201).data;
    assert.match(first.pickup_code, /^[1-9]\d{5}$/);
    noSecrets(first);
    assert.equal(first.amount, 1000); assert.equal(first.service_fee, 0); assert.equal(first.delivery_fee, 0);
    assert.equal(first.reserved_until, pickupInstant(startOfToday(), '23:59').toISOString());
    assert.equal((await prisma.box.findUnique({ where: { id: box.id } })).qty_left, 0);
    assert.equal((await api('/orders/' + first.id, { token: otherToken })).status, 404);
    assert.equal((await api('/orders/' + first.id + '/cancel', { method: 'POST', token: otherToken, body: {} })).status, 404);
    const cancel = () => api('/orders/' + first.id + '/cancel', { method: 'POST', token: buyer.token, body: {} });
    assert.deepEqual((await Promise.all([cancel(), cancel()])).map((r) => r.status).sort(), [200, 409]);
    assert.equal((await prisma.box.findUnique({ where: { id: box.id } })).qty_left, 1);
    const second = (await book()).data;
    assert.equal((await api('/venue/pickup', { method: 'POST', venueToken: otherShop.venue_token, body: { code: second.pickup_code } })).status, 404);
    assert.equal((await api('/venue/boxes/' + box.id, { method: 'PATCH', venueToken: shop.venue_token, body: { price: 900 } })).status, 409);
    const issue = () => api('/venue/orders/' + second.id + '/pickup', { method: 'POST', venueToken: shop.venue_token, body: { code: second.pickup_code } });
    const issued = await Promise.all([issue(), issue()]);
    assert.equal(issued.filter((r) => r.status === 200).length, 1);
    assert.ok(issued.every((r) => [200, 400, 409].includes(r.status)));
    const me = await prisma.user.findUnique({ where: { id: buyer.user.id } });
    assert.equal(me.boxes_saved, 1); assert.equal(me.money_saved, 1000);
    const stats = (await api('/venue/me', { venueToken: shop.venue_token })).data.today_stats;
    assert.equal(stats.revenue, 900);
    assert.equal(typeof stats.waiting, 'number');
    assert.equal((await api('/ratings', { method: 'POST', token: buyer.token, body: { order_id: second.id, stars: 6 } })).status, 400);
    assert.equal((await api('/ratings', { method: 'POST', token: buyer.token, body: { order_id: second.id, stars: 5 } })).status, 201);
    assert.equal((await api('/ratings', { method: 'POST', token: buyer.token, body: { order_id: second.id, stars: 4 } })).status, 409);
    const history = (await api('/orders', { token: buyer.token })).data.past;
    assert.equal(history.find((o) => o.id === second.id).rating.stars, 5);
    noSecrets(history);
    // Database CHECK constraints back up the API rules.
    await assert.rejects(prisma.box.update({ where: { id: box.id }, data: { price: offer.original_price + 1 } }));
    await assert.rejects(prisma.box.update({ where: { id: box.id }, data: { qty_left: -1 } }));
    const repeatable = (await api('/venue/boxes', { method: 'POST', venueToken: shop.venue_token, body: { ...offer, qty: 2 } })).data;
    assert.equal((await api('/admin/boxes/' + repeatable.id, { method: 'PATCH', token: adminToken, body: { is_approved: true } })).status, 200);
    const idempotencyKey = randomUUID();
    const retry = () => api('/orders', { method: 'POST', token: buyer.token, body: { box_id: repeatable.id, idempotency_key: idempotencyKey } });
    const repeated = await Promise.all([retry(), retry()]);
    assert.deepEqual(repeated.map((r) => r.status).sort(), [200, 201]);
    assert.equal(repeated[0].data.id, repeated[1].data.id);
    assert.equal((await prisma.box.findUnique({ where: { id: repeatable.id } })).qty_left, 1);
    const publicFeed = (await api('/boxes')).data;
    assert.equal(publicFeed.find((item) => item.id === repeatable.id).popularity_today, 1);
    assert.equal((await api('/orders', { method: 'POST', token: buyer.token, body: { box_id: box.id, idempotency_key: idempotencyKey } })).status, 409);
    assert.equal((await api('/venue/boxes/' + repeatable.id, { method: 'PATCH', venueToken: shop.venue_token, body: { status: 'EXPIRED' } })).status, 200);
    assert.equal((await prisma.order.findUnique({ where: { id: repeated[0].data.id } })).status, 'RESERVED');
    const closed = await prisma.box.create({ data: { ...offer, qty: undefined, venue_id: shop.id, qty_total: 1, qty_left: 1, pickup_date: new Date(startOfToday().getTime() - 86400000) } });
    assert.equal((await api('/orders', { method: 'POST', token: buyer.token, body: { box_id: closed.id } })).status, 409);
    await expireBoxesAndCancelOrders();
    assert.equal((await prisma.box.findUnique({ where: { id: closed.id } })).status, 'EXPIRED');
    assert.equal((await api('/me', { method: 'PATCH', token: buyer.token, body: { phone: '+77001234567' } })).status, 400);
    assert.equal((await api('/me', { method: 'PATCH', token: buyer.token, body: { display_name: 'x'.repeat(101) } })).status, 400);
    assert.equal((await api('/me', { method: 'PATCH', token: buyer.token, body: { avatar_preset: '<img>' } })).status, 400);
    assert.equal((await api('/me', { method: 'PATCH', token: buyer.token, body: { display_name: ' Әли ' } })).data.display_name, 'Әли');
    assert.equal((await api('/health')).status, 200);
    t.diagnostic('Real PostgreSQL transactions and HTTP endpoints passed; no mocked database.');
  } finally {
    // Only rows owned by this isolated test run, never a global reset or seed.
    await prisma.favorite.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.rating.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.order.deleteMany({ where: { box: { venue_id: { in: venueIds } } } });
    await prisma.box.deleteMany({ where: { venue_id: { in: venueIds } } });
    await prisma.venue.deleteMany({ where: { id: { in: venueIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }
});
