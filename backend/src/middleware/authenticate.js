const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');
const AppError = require('../errors/AppError');

const roles = new Set(['User', 'Organizer']);

function unauthorized(res) {
  return res.status(401).json({ error: 'Authentication required.' });
}

function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+(\S+)$/i)
    : null;

  if (!match) {
    return unauthorized(res);
  }

  let decoded;
  try {
    decoded = jwt.verify(match[1], getJwtSecret(), { algorithms: ['HS256'] });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return unauthorized(res);
  }

  if (
    !decoded ||
    typeof decoded !== 'object' ||
    typeof decoded.sub !== 'string' ||
    typeof decoded.email !== 'string' ||
    !roles.has(decoded.role)
  ) {
    return unauthorized(res);
  }

  req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
  return next();
}

module.exports = authenticate;
