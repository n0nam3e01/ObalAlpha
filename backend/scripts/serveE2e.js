// Test entry point only. Never accepts a production database or public bind.
const assert = require('node:assert/strict');
assert.equal(process.env.NODE_ENV, 'test');
const url = new URL(process.env.TEST_DATABASE_URL);
assert.match(url.pathname, /^\/obal_test(?:_\w+)?$/);
assert.ok(['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname));
assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL);
const app = require('../server');
const prisma = require('../lib/prisma');
const server = app.listen(3301, '127.0.0.1');
async function stop() {
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
