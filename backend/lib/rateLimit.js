// Minimal in-memory rate limiter — no extra dependency.
//
// Guards the credential endpoints (venue access code, phone login) against
// brute force. Per-process only: with multiple instances each holds its own
// counters, so treat this as a speed bump, not a hard quota. Swap for a
// Redis-backed limiter if the pilot outgrows a single node.

const buckets = new Map();

// Drop stale buckets every 10 min so the map can't grow without bound.
const SWEEP_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now > b.resetAt) buckets.delete(key);
  }
}, SWEEP_MS).unref();

function rateLimit({ windowMs = 60_000, max = 10, key = (req) => req.ip } = {}) {
  return (req, res, next) => {
    const id = `${req.baseUrl}${req.path}:${key(req)}`;
    const now = Date.now();
    const bucket = buckets.get(id);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'too_many_requests', retry_after: retryAfter });
    }
    next();
  };
}

module.exports = { rateLimit };
