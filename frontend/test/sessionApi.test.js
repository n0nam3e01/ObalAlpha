import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const previous = { fetch: globalThis.fetch, localStorage: globalThis.localStorage };
const stored = new Map([['obal_token', 'legacy-long-jwt']]);
globalThis.localStorage = { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) };
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
after(async () => { await server.close(); globalThis.fetch = previous.fetch; globalThis.localStorage = previous.localStorage; });
const api = await server.ssrLoadModule('/src/lib/api.js');
test('access JWTs stay in memory and legacy persisted tokens are removed', () => {
  assert.equal(api.getToken(), null);
  assert.equal(stored.has('obal_token'), false);
  api.setToken('short-token');
  assert.equal(api.getToken(), 'short-token');
  assert.equal(stored.has('obal_token'), false);
  api.setToken(null);
});
test('parallel unauthorized requests share one cookie refresh and retry once', async () => {
  let refreshes = 0;
  let requests = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      assert.equal(options.credentials, 'include');
      await new Promise((resolve) => setImmediate(resolve));
      return Response.json({ token: 'fresh-token', user: { id: 1 } });
    }
    requests++;
    return options.headers.Authorization === 'Bearer fresh-token' ? Response.json({ ok: true }) : Response.json({ error: 'token_invalid' }, { status: 401 });
  };
  api.setToken('expired-token');
  const results = await Promise.all([api.apiFetch('/me'), api.apiFetch('/orders')]);
  assert.equal(refreshes, 1); assert.equal(requests, 4);
  assert.ok(results.every((item) => item.ok));
});
test('an older refresh response cannot overwrite a newer login or logout', async () => {
  let finish;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  api.setToken(null);
  const old = api.refreshAccess();
  api.setToken('new-login-token');
  finish(Response.json({ error: 'session_expired' }, { status: 401 }));
  await assert.rejects(old);
  assert.equal(api.getToken(), 'new-login-token');
  const late = api.refreshAccess();
  api.setToken(null);
  finish(Response.json({ token: 'old-refresh-token', user: { id: 1 } }));
  await late;
  assert.equal(api.getToken(), null);
});
test('a different account in the shared refresh cookie cannot replay a mutation under that account', async () => {
  let mutations = 0;
  globalThis.fetch = async (url) => {
    if (url.endsWith('/auth/refresh')) return Response.json({ token: 'account-B', user: { id: 2 } });
    mutations++;
    return Response.json({ error: 'token_invalid' }, { status: 401 });
  };
  api.setToken('account-A', 1);
  await assert.rejects(api.apiFetch('/orders', { method: 'POST', body: '{"box_id":1}' }), { code: 'account_changed' });
  assert.equal(mutations, 1);
  assert.equal(api.getToken(), null);
});
