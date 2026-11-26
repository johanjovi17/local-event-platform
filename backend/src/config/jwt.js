const AppError = require('../errors/AppError');

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT_SECRET is not configured.', 500);
  }
  return process.env.JWT_SECRET;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '1h';
}

module.exports = { getJwtExpiresIn, getJwtSecret };
