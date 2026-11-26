const test = require('node:test');
const assert = require('node:assert/strict');
const authorizeRoles = require('../src/middleware/authorizeRoles');

function runMiddleware(user, allowedRoles) {
  const req = { user };
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

  authorizeRoles(allowedRoles)(req, res, () => {
    nextCalled = true;
  });

  return { res, nextCalled };
}

test('returns 401 when no authenticated user is attached', () => {
  const result = runMiddleware(undefined, 'Organizer');

  assert.equal(result.res.statusCode, 401);
  assert.equal(result.nextCalled, false);
});

test('returns 403 when the user role is not allowed', () => {
  const result = runMiddleware({ role: 'User' }, ['Organizer']);

  assert.equal(result.res.statusCode, 403);
  assert.equal(result.nextCalled, false);
});

test('allows an authenticated user with an allowed role', () => {
  const result = runMiddleware({ role: 'Organizer' }, 'Organizer');

  assert.equal(result.nextCalled, true);
});
