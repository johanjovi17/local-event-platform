const test = require('node:test');
const assert = require('node:assert/strict');
const AppError = require('../src/errors/AppError');
const prisma = require('../src/db/prisma');
const profileService = require('../src/services/profileService');

test('validates permitted user and organizer profile fields', () => {
  assert.deepEqual(
    profileService.validateProfileInput(
      { name: '  Goa User ', email: ' USER@example.com ' },
      false,
    ),
    { name: 'Goa User', email: 'user@example.com' },
  );
  assert.deepEqual(
    profileService.validateProfileInput(
      {
        name: 'Goa Organizer',
        organizationName: '  Goa Events ',
        description: ' Local events ',
        contactInfo: null,
      },
      true,
      false,
    ),
    {
      name: 'Goa Organizer',
      organizationName: 'Goa Events',
      description: 'Local events',
      contactInfo: null,
    },
  );
});

test('rejects invalid and protected profile fields', () => {
  for (const [input, isOrganizer, allowEmail = true] of [
    [{ name: ' ' }, false],
    [{ email: 'invalid' }, false],
    [{ role: 'Organizer', name: 'Name' }, false],
    [{ passwordHash: 'secret', name: 'Name' }, true],
    [{ contactInfo: 'contact' }, false],
    [{ email: 'user@example.com' }, true, false],
  ]) {
    assert.throws(
      () => profileService.validateProfileInput(input, isOrganizer, allowEmail),
      (error) => error instanceof AppError && error.statusCode === 400,
    );
  }
});

test('returns user profiles with registrations and event details, excluding password fields', async () => {
  const originalFindUnique = prisma.user.findUnique;
  prisma.user.findUnique = async () => ({
    id: 'user-id',
    name: 'Goa User',
    email: 'user@example.com',
    role: 'User',
    organizationName: null,
    description: null,
    contactInfo: null,
    registrations: [{ id: 'registration-id', event: { id: 'event-id' } }],
    events: [],
  });

  try {
    const profile = await profileService.getOwnProfile('user-id');
    assert.deepEqual(profile, {
      id: 'user-id',
      name: 'Goa User',
      email: 'user@example.com',
      role: 'User',
      organizationName: null,
      description: null,
      contactInfo: null,
      registrations: [{ id: 'registration-id', event: { id: 'event-id' } }],
    });
    assert.equal(Object.hasOwn(profile, 'passwordHash'), false);
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }
});

test('updates only the authenticated profile and rejects an email used by another account', async () => {
  const originalFindUnique = prisma.user.findUnique;
  const originalUpdate = prisma.user.update;
  const calls = [];
  prisma.user.findUnique = async ({ where }) => {
    calls.push(where);
    if (where.id) return { id: where.id };
    return { id: 'another-user-id' };
  };
  prisma.user.update = async (args) => args;

  try {
    await assert.rejects(
      profileService.updateOwnProfile(
        'user-id',
        { name: 'New Name', email: 'taken@example.com' },
        false,
      ),
      (error) => error instanceof AppError && error.statusCode === 409,
    );
    assert.deepEqual(calls, [
      { id: 'user-id' },
      { email: 'taken@example.com' },
    ]);
  } finally {
    prisma.user.findUnique = originalFindUnique;
    prisma.user.update = originalUpdate;
  }
});

test('returns only public organizer profile fields and owned events', async () => {
  const originalFindFirst = prisma.user.findFirst;
  let args;
  prisma.user.findFirst = async (query) => {
    args = query;
    return {
      id: 'organizer-id',
      name: 'Goa Organizer',
      organizationName: 'Goa Events',
      description: 'Local events',
      contactInfo: 'organizer@example.com',
      events: [{ id: 'event-id', title: 'Festival' }],
    };
  };

  try {
    assert.deepEqual(
      await profileService.getPublicOrganizerProfile('organizer-id'),
      {
        profile: {
          id: 'organizer-id',
          name: 'Goa Organizer',
          organizationName: 'Goa Events',
          description: 'Local events',
          contactInfo: 'organizer@example.com',
        },
        events: [{ id: 'event-id', title: 'Festival' }],
      },
    );
  } finally {
    prisma.user.findFirst = originalFindFirst;
  }

  assert.deepEqual(args.where, { id: 'organizer-id', role: 'Organizer' });
  assert.equal(Object.hasOwn(args.select, 'passwordHash'), false);
});
