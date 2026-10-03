const { test } = require('node:test');
const assert = require('node:assert/strict');
const { allocatePickupCode } = require('../lib/pickupCode');

test('code allocation locks venue and retries a live-code collision', async () => {
  const events = [];
  const candidates = ['123456', '654321'];
  const tx = {
    $queryRaw: async (_, venueId) => events.push(['lock', venueId]),
    order: { count: async ({ where }) => {
      events.push(['check', where.box.venue_id, where.pickup_code]);
      assert.deepEqual(where.status.in, ['RESERVED', 'PAID']);
      assert.ok(where.reserved_until.gt instanceof Date);
      return where.pickup_code === '123456' ? 1 : 0;
    } },
  };
  assert.equal(await allocatePickupCode(tx, 42, () => candidates.shift()), '654321');
  assert.deepEqual(events, [['lock', 42], ['check', 42, '123456'], ['check', 42, '654321']]);
});

test('six numeric digits and failure if code space cannot be allocated', async () => {
  const tx = { $queryRaw: async () => {}, order: { count: async () => 0 } };
  assert.match(await allocatePickupCode(tx, 1), /^[1-9]\d{5}$/);
  tx.order.count = async () => 1;
  await assert.rejects(allocatePickupCode(tx, 1), { message: 'pickup_code_unavailable', status: 409 });
});
