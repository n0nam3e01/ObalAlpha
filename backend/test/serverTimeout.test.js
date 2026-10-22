const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

test('startup bounds request lifetimes and destroys idle timed-out sockets', async () => {
  let idleTimeout;
  let idleHandler;
  const server = { setTimeout(ms, handler) { idleTimeout = ms; idleHandler = handler; } };
  const app = { disable() {}, set() {}, use() {}, get() {}, listen() { return server; } };
  const express = Object.assign(() => app, { json() {} });
  const module = { exports: {} };
  const requireStub = Object.assign((id) => {
    if (id === 'express') return express;
    if (id === 'cors') return () => () => {};
    if (id === 'dotenv') return { config() {} };
    if (id === './lib/prisma') return { async $connect() {} };
    if (id === './lib/cron') return { startCron: () => ({ stop() {} }) };
    if (id === './lib/supportBot') return { configureSupportWebhook: async () => null };
    if (id === './lib/rateLimit') return { rateLimit: () => () => {} };
    if (id.startsWith('./routes/')) return () => {};
    throw new Error('Unexpected import: ' + id);
  }, { main: module });
  runInNewContext(readFileSync(require.resolve('../server'), 'utf8'), {
    require: requireStub, module,
    process: { env: { JWT_SECRET: 'test-secret-'.repeat(4) }, once() {}, exit() { throw new Error('Startup failed'); } },
    console: { log() {}, error() {} }, setTimeout,
  });
  await new Promise(setImmediate);
  assert.equal(server.requestTimeout, 30_000);
  assert.equal(server.headersTimeout, 15_000);
  assert.equal(server.keepAliveTimeout, 5_000);
  assert.equal(idleTimeout, 60_000);
  let destroyed = false;
  idleHandler({ destroy() { destroyed = true; } });
  assert.equal(destroyed, true);
});
