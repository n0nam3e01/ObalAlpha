const axios = require('axios');
const { timingSafeEqual } = require('node:crypto');

function verifyWebhookSecret(supplied, expected) {
  if (typeof supplied !== 'string' || !expected) return false;
  const a = Buffer.from(supplied); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function telegramCall(method, data) {
  const token = process.env.SUPPORT_BOT_TOKEN;
  const result = await axios.post(`https://api.telegram.org/bot${token}/${method}`, data, { timeout: 15000 });
  if (!result.data.ok) throw new Error('telegram_request_failed');
  return result.data.result;
}

async function configureSupportWebhook(call = telegramCall, config = process.env) {
  if (!config.SUPPORT_BOT_TOKEN || !config.SUPPORT_WEBHOOK_SECRET || !config.SUPPORT_WEBHOOK_URL) return null;
  const url = new URL(config.SUPPORT_WEBHOOK_URL);
  if (url.protocol !== 'https:' || !/^[A-Za-z0-9_-]{32,256}$/.test(config.SUPPORT_WEBHOOK_SECRET)) throw new Error('invalid_support_config');
  const bot = await call('getMe', {});
  if (config.SUPPORT_BOT_USERNAME && bot.username !== config.SUPPORT_BOT_USERNAME) throw new Error('support_bot_username_mismatch');
  await call('setWebhook', { url: url.href, secret_token: config.SUPPORT_WEBHOOK_SECRET, allowed_updates: ['message'], drop_pending_updates: false });
  return bot.username;
}

async function handleSupportUpdate(update, call = telegramCall, ownerId = process.env.SUPPORT_OWNER_CHAT_ID, botId = process.env.SUPPORT_BOT_TOKEN?.split(':')[0]) {
  const message = update?.message;
  if (!message || message.chat?.type !== 'private' || !message.from || message.from.is_bot) return;
  const chatId = message.chat.id;
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  const send = async (id, value) => {
    for (let start = 0; start < value.length; start += 4000) {
      await call('sendMessage', { chat_id: String(id), text: value.slice(start, start + 4000) });
    }
  };
  if (/^\/id(?:@\w+)?$/.test(text)) return send(chatId, `Ваш Telegram chat ID: ${chatId}`);
  if (/^\/(start|help)(?:@\w+)?(?:\s.*)?$/.test(text)) {
    return send(chatId, 'Здравствуйте! Это поддержка Öbal. Какая у вас проблема? Напишите её одним сообщением, при необходимости укажите номер заказа. Мы передадим сообщение, ваше имя и @username администратору. Пароли и платёжные данные не отправляйте.');
  }
  if (!text || text.startsWith('/')) return send(chatId, 'Опишите проблему текстом одним сообщением. Для начала нажмите /start.');
  if (!ownerId) return send(chatId, 'Поддержка пока подключается. Сообщение не отправлено. Попробуйте позже.');
  if (String(chatId) === String(ownerId)) {
    const quoted = message.reply_to_message;
    const fromThisBot = Boolean(botId && quoted?.from?.is_bot === true && String(quoted.from.id) === String(botId));
    const match = fromThisBot && quoted.text?.match(/^Обращение Öbal\nTelegram ID: ([1-9]\d*)\n/);
    if (!match) return send(chatId, 'Ответьте на сообщение с обращением, чтобы отправить ответ покупателю.');
    await send(match[1], `Ответ поддержки Öbal:\n\n${text}`);
    return send(chatId, 'Ответ отправлен покупателю.');
  }
  const name = [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || 'Пользователь';
  const username = message.from.username ? `@${message.from.username}` : 'username не задан';
  // Trusted routing marker comes before every customer-controlled field.
  const prefix = `Обращение Öbal\nTelegram ID: ${message.from.id}\nИмя: ${name}\nКонтакт: ${username}\nПрофиль: tg://user?id=${message.from.id}\n\nПроблема:\n`;
  // Leave space for identity and keep long messages intact across parts.
  for (let i = 0; i < text.length; i += 3000) await send(ownerId, prefix + text.slice(i, i + 3000));
  await send(chatId, 'Спасибо! Ваше обращение передано поддержке. Ответ придёт сюда.');
}

module.exports = { handleSupportUpdate, verifyWebhookSecret, telegramCall, configureSupportWebhook };
