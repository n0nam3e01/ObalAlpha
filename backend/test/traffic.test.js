const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');

// Stub external services and routes before loading the real application boundary.
// The database and dotenv never run; requests are in-process with no live API.
const load = Module._load;
let queryCount = 0;
Module._load = function (id, ...args) {
  if (id === 'dotenv') return { config() {} };
  if (id === './lib/prisma') return { async $queryRaw() { queryCount++; } };
  if (id === './lib/cron') return {};
  if (id === './lib/supportBot') return {
    verifyWebhookSecret: (actual, expected) => Boolean(expected) && actual === expected,
  };
  if (id.startsWith('./routes/')) {
    const router = express.Router();
    router.use((_req, res) => res.json({ ok: true }));
    return router;
  }
  return load.call(this, id, ...args);
};
const app = require('../server');
Module._load = load;

function request(path, { method = 'GET', secret, rawBody, ip = '203.0.113.70' } = {}) {
  return new Promise((resolve, reject) => {
    const { Readable } = require('node:stream');
    const req = Readable.from(rawBody === undefined ? [] : [rawBody]);
    req.url = path;
    req.method = method;
    req.headers = {
      ...(secret ? { 'x-telegram-bot-api-secret-token': secret } : {}),
      ...(rawBody !== undefined ? { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(rawBody)) } : {}),
    };
    req.socket = { remoteAddress: ip };
    const res = new (require('node:http').ServerResponse)(req);
    res.end = (body) => resolve({ status: res.statusCode, body: body && String(body), headers: res.getHeaders() });
    app.handle(req, res, reject);
  });
}

test('API quota spans paths and rejects before parsing JSON', async () => {
  for (let i = 0; i < 600; i++) assert.equal((await request('/api/boxes/' + i)).status, 200);
  const blocked = await request('/api/auth/login', { method: 'POST', rawBody: '{' });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers['retry-after']) > 0);
});

test('health checks have an independent bounded database quota', async () => {
  for (let i = 0; i < 120; i++) assert.equal((await request('/api/health')).status, 200);
  assert.equal((await request('/api/health')).status, 429);
  assert.equal(queryCount, 120);
});

test('verified Telegram deliveries keep their own quota when public traffic is exhausted', async () => {
  const previous = process.env.SUPPORT_WEBHOOK_SECRET;
  process.env.SUPPORT_WEBHOOK_SECRET = 'test-webhook-secret';
  try {
    const ip = '203.0.113.71';
    for (let i = 0; i < 600; i++) assert.equal((await request('/api/boxes/' + i, { ip })).status, 200);
    assert.equal((await request('/api/support/telegram', { method: 'POST', secret: 'wrong', rawBody: '{}', ip })).status, 429);
    assert.equal((await request('/api/support/telegram', { method: 'POST', secret: 'test-webhook-secret', rawBody: '{}', ip })).status, 200);
    for (let i = 1; i < 600; i++) assert.equal((await request('/api/support/telegram', { method: 'POST', secret: 'test-webhook-secret', rawBody: '{}', ip })).status, 200);
    assert.equal((await request('/api/support/telegram', { method: 'POST', secret: 'test-webhook-secret', rawBody: '{}', ip })).status, 429);
  } finally {
    if (previous === undefined) delete process.env.SUPPORT_WEBHOOK_SECRET;
    else process.env.SUPPORT_WEBHOOK_SECRET = previous;
  }
});
