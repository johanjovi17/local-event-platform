const AppError = require('../errors/AppError');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error.status === 400 && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body contains invalid JSON.' });
  }

  console.error(error);
  return res.status(500).json({ error: 'An unexpected error occurred.' });
}

module.exports = errorHandler;
