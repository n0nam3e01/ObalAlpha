const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rateLimit } = require('../lib/rateLimit');

function request(limiter, { ip = '203.0.113.1', path = '/orders/1/pickup' } = {}) {
  const result = { status: 200, headers: {}, passed: false };
  const res = {
    set(name, value) { result.headers[name] = value; return this; },
    status(status) { result.status = status; return this; },
    json(body) { result.body = body; return this; },
  };
  limiter({ ip, path, baseUrl: '/api/venue' }, res, () => { result.passed = true; });
  return result;
}

test('changing a resource ID does not reset a limiter quota', () => {
  const limiter = rateLimit({ max: 2 });
  assert.equal(request(limiter).passed, true);
  assert.equal(request(limiter, { path: '/orders/2/pickup' }).passed, true);
  const blocked = request(limiter, { path: '/orders/3/pickup' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.passed, false);
  assert.equal(blocked.headers['Retry-After'], '60');
});

test('separate limiter instances do not share quotas', () => {
  const first = rateLimit({ max: 1 });
  const second = rateLimit({ max: 1 });
  assert.equal(request(first).passed, true);
  assert.equal(request(first).status, 429);
  assert.equal(request(second).passed, true);
});

test('full bucket capacity rejects new clients without evicting an active quota', () => {
  const limiter = rateLimit({ max: 1, maxBuckets: 2 });
  assert.equal(request(limiter, { ip: 'client-a' }).passed, true);
  assert.equal(request(limiter, { ip: 'client-b' }).passed, true);
  assert.equal(request(limiter, { ip: 'client-c' }).status, 429);
  assert.equal(request(limiter, { ip: 'client-a' }).status, 429);
});

test('expired windows release capacity, including at the exact reset time', (t) => {
  t.mock.method(Date, 'now', () => 1000);
  const limiter = rateLimit({ max: 1, windowMs: 1000, maxBuckets: 1 });
  assert.equal(request(limiter, { ip: 'first' }).passed, true);
  Date.now.mock.mockImplementation(() => 2000);
  assert.equal(request(limiter, { ip: 'first' }).passed, true);
  Date.now.mock.mockImplementation(() => 3000);
  assert.equal(request(limiter, { ip: 'second' }).passed, true);
});
