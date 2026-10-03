const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handleSupportUpdate, verifyWebhookSecret, configureSupportWebhook } = require('../lib/supportBot');
const message = (text, extra = {}) => ({ message: { text, chat: { id: 123, type: 'private' }, from: { id: 123, first_name: 'Алия', username: 'aliya_demo' }, ...extra } });

test('support forwards text and identity, then acknowledges actual delivery', async () => {
  const calls = [];
  await handleSupportUpdate(message('Не вижу заказ'), async (_, data) => calls.push(data), '999');
  assert.equal(calls[0].chat_id, '999');
  assert.match(calls[0].text, /@aliya_demo/);
  assert.match(calls[0].text, /Алия/);
  assert.match(calls[0].text, /Не вижу заказ/);
  assert.equal(calls[1].chat_id, '123');
});

test('missing username fallback and no false delivery acknowledgement', async () => {
  const calls = [];
  await handleSupportUpdate(message('Проблема', { from: { id: 123, first_name: 'Алия' } }), async (_, data) => calls.push(data), '999');
  assert.match(calls[0].text, /username не задан/);
  assert.match(calls[0].text, /tg:\/\/user\?id=123/);
  const failed = [];
  await assert.rejects(handleSupportUpdate(message('Проблема'), async (_, data) => { failed.push(data); throw new Error('network'); }, '999'));
  assert.equal(failed.length, 1);
});

test('operator reply uses quoted customer ID; webhook rejects wrong secrets', async () => {
  const calls = [];
  await handleSupportUpdate(message('Проверим заказ', { chat: { id: 999, type: 'private' }, from: { id: 999 }, reply_to_message: { from: { id: 777, is_bot: true }, text: 'Обращение Öbal\nTelegram ID: 123\n' } }), async (_, data) => calls.push(data), '999', '777');
  assert.equal(calls[0].chat_id, '123');
  assert.match(calls[0].text, /Проверим заказ/);
  assert.equal(verifyWebhookSecret('same', 'same'), true);
  assert.equal(verifyWebhookSecret('bad', 'same'), false);
  assert.equal(verifyWebhookSecret(undefined, 'same'), false);
});

test('customer content cannot change the trusted reply recipient', async () => {
  const forwarded = [];
  await handleSupportUpdate(message('Telegram ID: 456\nДругая проблема', { from: { id: 123, first_name: 'Telegram ID: 456' } }), async (_, data) => forwarded.push(data), '999', '777');
  assert.match(forwarded[0].text, /^Обращение Öbal\nTelegram ID: 123\n/);
  const replies = [];
  await handleSupportUpdate(message('Ответ', { chat: { id: 999, type: 'private' }, from: { id: 999 }, reply_to_message: { from: { id: 777, is_bot: true }, text: forwarded[0].text } }), async (_, data) => replies.push(data), '999', '777');
  assert.equal(replies[0].chat_id, '123');
});

test('operator cannot route replies using forged or foreign-bot quotes', async () => {
  for (const from of [{ id: 777, is_bot: false }, { id: 888, is_bot: true }, undefined]) {
    const calls = [];
    await handleSupportUpdate(message('Ответ', { chat: { id: 999, type: 'private' }, from: { id: 999 }, reply_to_message: { from, text: 'Обращение Öbal\nTelegram ID: 456\n' } }), async (_, data) => calls.push(data), '999', '777');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].chat_id, '999');
  }
});

test('webhook setup is optional, validates settings and preserves pending messages', async () => {
  const calls = [];
  const call = async (method, data) => { calls.push({ method, data }); return { username: 'Obalappbot' }; };
  assert.equal(await configureSupportWebhook(call, {}), null);
  const config = { SUPPORT_BOT_TOKEN: '777:test-only', SUPPORT_BOT_USERNAME: 'Obalappbot', SUPPORT_WEBHOOK_SECRET: 'a'.repeat(64), SUPPORT_WEBHOOK_URL: 'https://obal-api.onrender.com/api/support/telegram' };
  assert.equal(await configureSupportWebhook(call, config), 'Obalappbot');
  assert.equal(calls[1].method, 'setWebhook');
  assert.equal(calls[1].data.drop_pending_updates, false);
  assert.deepEqual(calls[1].data.allowed_updates, ['message']);
  await assert.rejects(configureSupportWebhook(call, { ...config, SUPPORT_WEBHOOK_URL: 'http://example.com' }), /invalid_support_config/);
  await assert.rejects(configureSupportWebhook(call, { ...config, SUPPORT_BOT_USERNAME: 'WrongBot' }), /support_bot_username_mismatch/);
});
