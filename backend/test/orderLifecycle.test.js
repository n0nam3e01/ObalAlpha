const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Transaction adapter for transition preconditions. PostgreSQL lock/race
// behavior is covered separately by integration.test.js against obal_test.
let row, box, credited, locks;
const tx = {
  $queryRaw: async (strings) => { locks.push(strings.join('?')); return []; },
  order: {
    async findFirst({ where }) {
      if (where.id !== row.id || (where.user_id && where.user_id !== row.user_id) ||
          (where.box && where.box.venue_id !== box.venue_id)) return null;
      return { ...row, box: { ...box } };
    },
    async updateMany({ where, data }) {
      const statuses = where.status?.in || [where.status];
      if (where.id !== row.id || !statuses.includes(row.status) || row.reserved_until <= where.reserved_until.gt) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    },
  },
  box: { async update({ data }) {
    if (data.qty_left) box.qty_left += data.qty_left.increment;
    if (data.status) box.status = data.status;
    return { ...box };
  } },
  user: { async update() { credited++; } },
};
const load = Module._load;
Module._load = function (id, ...args) {
  if (id === './prisma') return { $transaction: (callback) => callback(tx) };
  return load.call(this, id, ...args);
};
const { cancelOrder, cancelVenueOrder, pickupOrder } = require('../lib/orderTransitions');
Module._load = load;

beforeEach(() => {
  row = { id: 1, user_id: 2, box_id: 3, qty: 2, amount: 1000, status: 'RESERVED', reserved_until: new Date(Date.now() + 3600000) };
  box = { id: 3, venue_id: 4, qty_left: 0, status: 'SOLD_OUT', pickup_date: new Date(), pickup_start: '00:00', pickup_end: '23:59', original_price: 1000 };
  credited = 0;
  locks = [];
});

test('venue cancellation records a trimmed reason and closes unavailable food; repeat cannot restore stock twice', async () => {
  await cancelVenueOrder(1, 4, '  Набор испорчен  ');
  assert.equal(row.status, 'CANCELLED');
  assert.equal(row.cancelled_by, 'VENUE');
  assert.equal(row.cancellation_reason, 'Набор испорчен');
  assert.ok(row.cancelled_at instanceof Date);
  assert.equal(box.qty_left, 2);
  assert.equal(box.status, 'EXPIRED');
  assert.match(locks[0], /FROM "User"/);
  assert.match(locks[1], /FROM "Box"/);
  await assert.rejects(cancelVenueOrder(1, 4, 'Повторная отмена'), { status: 409 });
  assert.equal(box.qty_left, 2);
});

test('venue cancellation rejects another venue, invalid reasons, paid and expired orders', async () => {
  await assert.rejects(cancelVenueOrder(1, 99, 'Набор недоступен'), { status: 404 });
  for (const reason of ['', '  ', 'abc', 'x'.repeat(501), {}, null]) {
    await assert.rejects(cancelVenueOrder(1, 4, reason), { status: 400 });
  }
  row.status = 'PAID';
  await assert.rejects(cancelVenueOrder(1, 4, 'Набор недоступен'), { status: 409 });
  row.status = 'RESERVED'; row.reserved_until = new Date(0);
  await assert.rejects(cancelVenueOrder(1, 4, 'Набор недоступен'), { status: 409 });
  assert.equal(box.qty_left, 0);
});

test('customer cancellation records its author and never relists an unpublished offer', async () => {
  box.status = 'EXPIRED';
  await cancelOrder(1, 2);
  assert.equal(row.cancelled_by, 'CUSTOMER');
  assert.ok(row.cancelled_at instanceof Date);
  assert.equal(box.status, 'EXPIRED');
});

test('pickup records the actual time once and cannot issue a cancelled order', async () => {
  await pickupOrder({ ...row, box: { ...box } });
  assert.equal(row.status, 'PICKED_UP');
  assert.ok(row.picked_up_at instanceof Date);
  assert.match(locks[0], /FROM "User"/);
  assert.match(locks[1], /FROM "Box"/);
  await assert.rejects(pickupOrder({ ...row, box: { ...box } }), { status: 409 });
  assert.equal(credited, 1);
});
