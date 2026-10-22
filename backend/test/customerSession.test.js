const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { refreshHash, cookieOptions, readRefreshCookie, requireSessionOrigin } = require('../lib/customerSessions');

test('refresh secrets are hashed and only a valid fixed-size cookie is accepted', () => {
  const secret = 'a'.repeat(64);
  assert.equal(refreshHash(secret), createHash('sha256').update(secret).digest('hex'));
  assert.equal(readRefreshCookie({ headers: { cookie: 'other=x; obal_refresh=' + secret } }), secret);
  for (const cookie of ['obal_refresh=short', 'obal_refresh=' + 'z'.repeat(64), 'obal_refresh=%', '']) {
    assert.equal(readRefreshCookie({ headers: { cookie } }), null);
  }
});
test('production cookies are HttpOnly, Secure, scoped and have a bounded lifetime', () => {
  const opts = cookieOptions({ NODE_ENV: 'production' });
  assert.equal(opts.httpOnly, true); assert.equal(opts.secure, true);
  assert.equal(opts.path, '/api/auth'); assert.equal(opts.sameSite, 'lax');
  assert.equal(opts.maxAge, 7 * 86400000);
  assert.equal(cookieOptions({ NODE_ENV: 'production', SESSION_SAME_SITE: 'none' }).sameSite, 'none');
});
test('cookie session endpoints reject untrusted browser origins', () => {
  const old = process.env.CORS_ORIGIN;
  process.env.CORS_ORIGIN = 'https://shop.example';
  try {
    for (const [origin, expected] of [['https://evil.example', 403], ['https://shop.example', 200]]) {
      let status = 200; let next = false;
      const req = { get: (key) => key === 'Origin' ? origin : undefined };
      const res = { status(code) { status = code; return this; }, json() {} };
      requireSessionOrigin(req, res, () => { next = true; });
      assert.equal(status, expected); assert.equal(next, expected === 200);
    }
  } finally { if (old === undefined) delete process.env.CORS_ORIGIN; else process.env.CORS_ORIGIN = old; }
});
