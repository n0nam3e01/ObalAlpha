const axios = require('axios');

async function sendMessage(telegramId, htmlText) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: String(telegramId),
      text: htmlText,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('Telegram sendMessage failed:', err.response?.data ?? err.message);
  }
}

module.exports = { sendMessage };
