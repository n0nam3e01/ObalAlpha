const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../lib/password');

test('passwords are salted and verified without storing plaintext', () => {
  const first = hashPassword('correct horse');
  const second = hashPassword('correct horse');
  assert.notEqual(first, second);
  assert.equal(verifyPassword('correct horse', first), true);
  assert.equal(verifyPassword('wrong horse', first), false);
});
