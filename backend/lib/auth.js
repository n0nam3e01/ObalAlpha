const jwt = require('jsonwebtoken');

function signJwt(payload, expiresIn = '30d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function jwtMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(req.user.userId) || req.user.userId < 1) return res.status(401).json({ error: 'token_invalid' });
    if (req.user.scope === 'admin') return res.status(403).json({ error: 'customer_only' });
    next();
  } catch {
    return res.status(401).json({ error: 'token_invalid' });
  }
}

module.exports = { signJwt, jwtMiddleware };
