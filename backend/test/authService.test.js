const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toPublicUser,
  validateLoginInput,
  validateRegisterInput,
} = require('../src/services/authService');

const validRegistration = {
  name: '  Alex Example ',
  email: '  ALEX@example.com ',
  password: 'correct horse battery staple',
  role: 'Organizer',
};

test('validates and normalizes registration input', () => {
  assert.deepEqual(validateRegisterInput(validRegistration), {
    name: 'Alex Example',
    email: 'alex@example.com',
    password: 'correct horse battery staple',
    role: 'Organizer',
  });
});

test('rejects invalid registration data and roles', () => {
  assert.throws(
    () =>
      validateRegisterInput({
        ...validRegistration,
        email: 'not-an-email',
        password: 'short',
        role: 'Admin',
      }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.details.length, 3);
      return true;
    },
  );
});

test('normalizes login email and requires both credentials', () => {
  assert.deepEqual(validateLoginInput({
    email: ' USER@example.com ',
    password: 'not-trimmed ',
  }), {
    email: 'user@example.com',
    password: 'not-trimmed ',
  });
  assert.throws(
    () => validateLoginInput({ email: 'user@example.com' }),
    (error) => error.statusCode === 400,
  );
});

test('public user output never includes password hash', () => {
  const user = toPublicUser({
    id: 'user-id',
    name: 'Alex',
    email: 'alex@example.com',
    role: 'User',
    passwordHash: 'secret-hash',
  });

  assert.deepEqual(user, {
    id: 'user-id',
    name: 'Alex',
    email: 'alex@example.com',
    role: 'User',
  });
});
