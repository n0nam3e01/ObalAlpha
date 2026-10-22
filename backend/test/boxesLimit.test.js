const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');
let query;
const load = Module._load;
Module._load = function (id, ...args) {
  if (id === '../lib/prisma') return { box: { async findMany(options) { query = options; return []; } } };
  return load.call(this, id, ...args);
};
const router = require('../routes/boxes');
Module._load = load;
const app = express();
app.use(router);

function request(url) {
  return new Promise((resolve, reject) => {
    const req = new (require('node:stream').Readable)({ read() { this.push(null); } });
    Object.assign(req, { method: 'GET', url, headers: {}, socket: { remoteAddress: '127.0.0.1' } });
    const res = new (require('node:http').ServerResponse)(req);
    res.end = (body) => resolve({ status: res.statusCode, body: JSON.parse(String(body)), headers: res.getHeaders() });
    app.handle(req, res, reject);
  });
}

test('public offer queries are bounded before hydration while retaining array responses and filters', async () => {
  const response = await request('/?category=BAKERY&q=bread&sort=ending');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
  assert.equal(query.take, 500);
  assert.deepEqual(query.orderBy, [{ pickup_end: 'asc' }, { id: 'asc' }]);
  assert.equal(query.where.venue.category, 'BAKERY');
  assert.equal(query.where.OR[0].title.contains, 'bread');
  assert.equal(response.headers['x-result-limit'], '500');
});

test('cheapest sorting is applied before the database result cap', async () => {
  await request('/?sort=cheapest');
  assert.deepEqual(query.orderBy, [{ price: 'asc' }, { id: 'asc' }]);
  assert.equal(query.take, 500);
});
