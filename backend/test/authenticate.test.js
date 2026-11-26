const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-for-auth-middleware';
const authenticate = require('../src/middleware/authenticate');

function runMiddleware(authorization) {
  const req = {
    get: () => authorization,
  };
  const res = {
    statusCode: undefined,
    body: undefined,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalled = false;
  let nextError;

  authenticate(req, res, (error) => {
    nextCalled = true;
    nextError = error;
  });

  return { req, res, nextCalled, nextError };
}

test('authenticates a valid Bearer token and attaches its claims', () => {
  const token = jwt.sign(
    { email: 'user@example.com', role: 'Organizer' },
    process.env.JWT_SECRET,
    { subject: 'user-id', expiresIn: '1h', algorithm: 'HS256' },
  );

  const result = runMiddleware(`Bearer ${token}`);

  assert.equal(result.nextCalled, true);
  assert.equal(result.nextError, undefined);
  assert.deepEqual(result.req.user, {
    id: 'user-id',
    email: 'user@example.com',
    role: 'Organizer',
  });
});

test('rejects missing, invalid, expired, and incomplete tokens', () => {
  const expired = jwt.sign(
    { email: 'user@example.com', role: 'User' },
    process.env.JWT_SECRET,
    { subject: 'user-id', expiresIn: -1, algorithm: 'HS256' },
  );
  const incomplete = jwt.sign(
    { email: 'user@example.com' },
    process.env.JWT_SECRET,
    { subject: 'user-id', expiresIn: '1h', algorithm: 'HS256' },
  );

  for (const authorization of [
    undefined,
    'Basic abc',
    'Bearer invalid-token',
    `Bearer ${expired}`,
    `Bearer ${incomplete}`,
  ]) {
    const result = runMiddleware(authorization);
    assert.equal(result.res.statusCode, 401);
    assert.equal(result.nextCalled, false);
  }
});
