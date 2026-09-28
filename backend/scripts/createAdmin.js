require('dotenv').config();
const { randomBytes } = require('node:crypto');
const prisma = require('../lib/prisma');
const { hashPassword } = require('../lib/password');

function readPassword() {
  if (process.env.ADMIN_PASSWORD) return Promise.resolve(process.env.ADMIN_PASSWORD);
  if (!process.stdin.isTTY) throw new Error('Run from an interactive terminal or set ADMIN_PASSWORD only in this terminal.');
  process.stdout.write('Пароль администратора (12–128 символов): ');
  return new Promise((resolve, reject) => {
    let value = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onData = (buffer) => {
      const char = buffer.toString('utf8');
      if (char === '\r' || char === '\n') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', onData); process.stdout.write('\n'); resolve(value); }
      else if (char === '\u0003') { process.stdin.setRawMode(false); process.stdin.off('data', onData); reject(new Error('Cancelled.')); }
      else if (char === '\u007f' || char === '\b') { value = value.slice(0, -1); }
      else if (char.length && !/[\u0000-\u001f]/.test(char)) { value += char; }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  const username = (process.env.ADMIN_USERNAME || 'adminsuperapp1').trim().toLowerCase();
  const password = await readPassword();
  if (!/^[a-z0-9_]{3,40}$/.test(username) || typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD (12–128 characters) in this terminal only.');
  }
  const existing = await prisma.user.findFirst({ where: { username } });
  if (existing) throw new Error('Username already exists; account was not changed.');
  await prisma.user.create({ data: { username, name: 'Администратор', display_name: 'Администратор', role: 'ADMIN', public_id: 'AD-' + randomBytes(6).toString('hex').toUpperCase(), password_hash: hashPassword(password) } });
  console.log('Admin account created:', username);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
