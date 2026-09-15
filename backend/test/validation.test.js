const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toId, toInt } = require('../lib/params');
const { pickupInstant } = require('../lib/time');
const { verifyPassword } = require('../lib/password');

test('strict integers, malformed passwords and Astana collection boundaries', () => {
  for (const input of ['1x', '1.5', 1.5, {}, [], null, true, '']) assert.equal(toId(input), null);
  assert.equal(toId('12'), 12);
  assert.equal(toInt('0', { min: 0, max: 3 }), 0);
  assert.equal(pickupInstant('2026-09-16', '19:30').toISOString(), '2026-09-16T14:30:00.000Z');
  assert.equal(pickupInstant('2026-09-16', '00:00').toISOString(), '2026-09-15T19:00:00.000Z');
  for (const time of ['24:00', '9:00', '12:60', {}, null]) assert.equal(pickupInstant('2026-09-16', time), null);
  for (const hash of [null, 'salt:', 'bad:00', {}]) assert.equal(verifyPassword('password', hash), false);
});
