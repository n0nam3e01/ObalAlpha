const jwt = require('jsonwebtoken');

function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function jwtMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(req.user.userId) || req.user.userId < 1) return res.status(401).json({ error: 'token_invalid' });
    next();
  } catch {
    return res.status(401).json({ error: 'token_invalid' });
  }
}

module.exports = { signJwt, jwtMiddleware };
