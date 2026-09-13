require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { startCron } = require('./lib/cron');
const { refreshDemoWindows } = require('./prisma/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Railway/Vercel terminate TLS upstream; without this every request reports
// the proxy's IP and the rate limiters would share a single bucket.
app.set('trust proxy', 1);

// Fail fast rather than signing tokens with `undefined` — jsonwebtoken would
// only throw on the first login, long after a bad deploy looked healthy.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}

// CORS_ORIGIN pins the allowed origins in production (comma-separated).
// Without it we fall back to reflecting any origin, which is fine for local
// dev (localhost, LAN IP, ngrok) but must not be the production posture.
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: CORS_ORIGIN is unset in production — every origin is allowed.');
}

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
}));
app.use(express.json({ limit: '256kb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/boxes', require('./routes/boxes'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/me', require('./routes/me'));
app.use('/api/venue', require('./routes/venue'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Obal backend running on port ${PORT}`);

  // Demo mode: refresh every box to a live "now" pickup window on each restart.
  if (process.env.DEMO_MODE === 'true') {
    try {
      const n = await refreshDemoWindows();
      console.log(`DEMO_MODE: refreshed ${n} boxes to live pickup windows`);
    } catch (err) {
      console.error('DEMO_MODE refresh failed:', err.message);
    }
  }

  startCron();
});
