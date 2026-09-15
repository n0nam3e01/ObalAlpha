require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const { startCron } = require('./lib/cron');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '256kb' }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  if (['POST', 'PATCH', 'PUT'].includes(req.method) &&
      (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ error: 'json_body_required' });
  }
  next();
});
for (const route of ['auth', 'boxes', 'orders', 'favorites', 'ratings', 'me', 'venue']) {
  app.use(`/api/${route}`, require(`./routes/${route}`));
}
app.get('/api/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ok: true, database: 'connected' }); }
  catch { res.status(503).json({ ok: false, database: 'unavailable' }); }
});
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'json_invalid' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'body_too_large' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'already_exists' });
  if ([400, 401, 403, 404, 409].includes(err.status)) return res.status(err.status).json({ error: err.message });
  console.error('API error:', err.code || err.name);
  res.status(500).json({ error: 'server_error' });
});

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('replace-with')) {
    throw new Error('Set a random JWT_SECRET with at least 32 characters.');
  }
  if (process.env.NODE_ENV === 'production' && (!process.env.CORS_ORIGIN || process.env.DEMO_MODE === 'true')) {
    throw new Error('Production requires CORS_ORIGIN and DEMO_MODE disabled.');
  }
  await prisma.$connect();
  const server = app.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log('Obal API listening'));
  const scheduler = startCron();
  const shutdown = () => {
    scheduler.stop();
    server.close(async () => { await prisma.$disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
if (require.main === module) start().catch((err) => { console.error('Startup failed:', err.code || err.message); process.exit(1); });
module.exports = app;
