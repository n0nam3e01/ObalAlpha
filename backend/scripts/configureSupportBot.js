require('dotenv').config();
const { randomBytes } = require('node:crypto');
const { configureSupportWebhook } = require('../lib/supportBot');

async function main() {
  if (process.argv.includes('--generate-secret')) {
    console.log(randomBytes(32).toString('hex')); return;
  }
  const username = await configureSupportWebhook();
  if (!username) {
    throw new Error('Set SUPPORT_BOT_TOKEN, SUPPORT_WEBHOOK_SECRET (32–256 safe characters), and an HTTPS SUPPORT_WEBHOOK_URL.');
  }
  console.log(`Support bot @${username}: webhook configured. Set SUPPORT_BOT_USERNAME=${username}.`);
}

main().catch(() => { console.error('Support bot setup failed. Check environment settings and Telegram access.'); process.exitCode = 1; });
