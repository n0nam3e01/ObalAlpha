// Minimal in-memory rate limiter — no extra dependency.
//
// Guards the credential endpoints (venue access code, phone login) against
// brute force. Per-process only: with multiple instances each holds its own
// counters, so treat this as a speed bump, not a hard quota. Swap for a
// Redis-backed limiter if the pilot outgrows a single node.

function rateLimit({ windowMs = 60_000, max = 10, maxBuckets = 10_000, key = (req) => req.ip } = {}) {
  // Each middleware owns one quota: varying resource IDs or paths cannot reset it.
  const buckets = new Map();
  let sweepAt = 0;
  return (req, res, next) => {
    const id = key(req);
    const now = Date.now();
    if (now >= sweepAt) {
      for (const [id, bucket] of buckets) {
        if (now >= bucket.resetAt) buckets.delete(id);
      }
      sweepAt = now + Math.min(windowMs, 60_000);
    }
    const bucket = buckets.get(id);
    const reject = (resetAt) => {
      const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'too_many_requests', retry_after: retryAfter });
    };

    if (!bucket || now >= bucket.resetAt) {
      // Do not evict active buckets: that would let churn reset another client's quota.
      if (!bucket && buckets.size >= maxBuckets) return reject(sweepAt);
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return reject(bucket.resetAt);
    }
    next();
  };
}

module.exports = { rateLimit };
