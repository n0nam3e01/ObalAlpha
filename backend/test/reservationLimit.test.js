const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');
let existing = null;
let locks = [];
const db = {
  user: { findUnique: async () => ({ id: 7, name: 'Покупатель' }) },
  order: {
    findFirst: async () => existing,
    count: async ({ where }) => {
      assert.equal(where.user_id, 7);
      assert.deepEqual(where.status.in, ['RESERVED', 'PAID']);
      assert.ok(where.reserved_until.gt instanceof Date);
      return 3;
    },
  },
  $queryRaw: async (strings) => { locks.push(strings.join('?')); },
  $transaction: async (fn) => fn(db),
};
const load = Module._load;
Module._load = function (id, ...args) {
  if (id === '../lib/prisma' || id === './prisma') return db;
  if (id === '../lib/auth') return { jwtMiddleware(req, _res, next) { req.user = { userId: 7 }; next(); } };
  return load.call(this, id, ...args);
};
const router = require('../routes/orders');
Module._load = load;
const app = express();
app.use((req, _res, next) => { req.body = { box_id: 9, idempotency_key: '0123456789abcdef' }; next(); });
app.use(router);
app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
function request() {
  return new Promise((resolve, reject) => {
    const req = new (require('node:stream').Readable)({ read() { this.push(null); } });
    Object.assign(req, { method: 'POST', url: '/', headers: {}, socket: { remoteAddress: '127.0.0.1' } });
    const res = new (require('node:http').ServerResponse)(req);
    res.end = (body) => resolve({ status: res.statusCode, body: JSON.parse(String(body)) });
    app.handle(req, res, reject);
  });
}
test('a fourth active booking is rejected before touching stock; buyer lock precedes box lock', async () => {
  locks = [];
  const response = await request();
  assert.equal(response.status, 409);
  assert.equal(response.body.error, 'active_order_limit');
  assert.match(locks[0], /FROM "User"/);
  assert.match(locks[1], /FROM "Box"/);
});
test('retry at the active booking limit returns its original order', async () => {
  existing = { id: 12, box_id: 9, qty: 1 };
  const response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.body.id, 12);
});
