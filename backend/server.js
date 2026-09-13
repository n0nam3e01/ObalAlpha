require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { startCron } = require('./lib/cron');
const { refreshDemoWindows } = require('./prisma/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Website mode: allow the dev frontend from any host (localhost, LAN IP, ngrok).
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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
