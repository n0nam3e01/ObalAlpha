const { Router } = require('express');
const { handleSupportUpdate, verifyWebhookSecret } = require('../lib/supportBot');
const router = Router();
const completed = new Map();
const running = new Map();

router.get('/', (_req, res) => {
  const username = process.env.SUPPORT_BOT_USERNAME || '';
  const enabled = Boolean(process.env.SUPPORT_BOT_TOKEN && process.env.SUPPORT_OWNER_CHAT_ID && process.env.SUPPORT_WEBHOOK_SECRET && /^[a-zA-Z0-9_]{5,32}$/.test(username));
  res.json({ enabled, telegram_url: enabled ? `https://t.me/${username}?start=app_support` : null });
});

router.post('/telegram', async (req, res) => {
  if (!process.env.SUPPORT_BOT_TOKEN || !process.env.SUPPORT_WEBHOOK_SECRET) return res.sendStatus(503);
  if (!verifyWebhookSecret(req.get('X-Telegram-Bot-Api-Secret-Token'), process.env.SUPPORT_WEBHOOK_SECRET)) return res.sendStatus(401);
  const id = req.body.update_id;
  if (!Number.isSafeInteger(id) || id < 0) return res.sendStatus(400);
  for (const [key, expires] of completed) if (expires <= Date.now()) completed.delete(key);
  if (completed.has(id)) return res.json({ ok: true });
  try {
    if (!running.has(id)) running.set(id, handleSupportUpdate(req.body));
    await running.get(id);
    completed.set(id, Date.now() + 24 * 60 * 60 * 1000);
    if (completed.size > 10000) completed.delete(completed.keys().next().value);
    res.json({ ok: true });
  } catch {
    // Never log an Axios error: its request URL contains the bot token.
    console.error('Support Telegram delivery failed');
    res.sendStatus(503);
  } finally { running.delete(id); }
});

module.exports = router;
