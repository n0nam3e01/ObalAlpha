const { test } = require('node:test');
const assert = require('node:assert/strict');
const proxyaddr = require('proxy-addr');

test('IPv4-mapped IPv6 trust masks cannot trust unrelated IPv4 clients', () => {
  // CVE-2026-90711: restoring proxy-addr 2.0.7 makes this assertion fail.
  assert.equal(proxyaddr.compile('::ffff:10.0.0.0/8')('203.0.113.9'), false);
  assert.equal(proxyaddr.compile('::/1')('203.0.113.9'), false);
  const privateSubnet = proxyaddr.compile('10.0.0.0/8');
  assert.equal(privateSubnet('10.1.2.3'), true);
  assert.equal(privateSubnet('203.0.113.9'), false);
  const mappedSubnet = proxyaddr.compile('::ffff:10.0.0.0/104');
  assert.equal(mappedSubnet('10.1.2.3'), true);
  assert.equal(mappedSubnet('203.0.113.9'), false);
});
