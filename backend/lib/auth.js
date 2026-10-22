const jwt = require('jsonwebtoken');

function signJwt(payload, expiresIn = '15m') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

async function jwtMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(req.user.userId) || req.user.userId < 1) return res.status(401).json({ error: 'token_invalid' });
    if (req.user.scope === 'admin') return res.status(403).json({ error: 'customer_only' });
  } catch {
    return res.status(401).json({ error: 'token_invalid' });
  }
  if (typeof req.user.sid !== 'string') return res.status(401).json({ error: 'session_required' });
  try {
    const session = await require('./prisma').customerSession.findFirst({ where: {
      id: req.user.sid, user_id: req.user.userId, revoked_at: null,
      expires_at: { gt: new Date() }, user: { role: 'CUSTOMER' },
    }, select: { id: true } });
    if (!session) return res.status(401).json({ error: 'session_expired' });
    next();
  } catch (error) { next(error); }
}

module.exports = { signJwt, jwtMiddleware };
