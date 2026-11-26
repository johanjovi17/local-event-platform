const test = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');
const AppError = require('../src/errors/AppError');
const prisma = require('../src/db/prisma');
const registrationService = require('../src/services/registrationService');

const futureEvent = {
  id: 'event-id',
  status: 'Upcoming',
  registrationDeadline: new Date('2999-06-15T00:00:00.000Z'),
  maxAttendees: 2,
};

function mockTransaction({
  lockedEvents = [{ id: 'event-id' }],
  event = futureEvent,
  existingRegistration = null,
  registrationCount = 0,
  createRegistration = async ({ data }) => ({ id: 'registration-id', ...data }),
} = {}) {
  const calls = {};
  const transaction = {
    $queryRaw: async (strings, ...values) => {
      calls.lock = { strings, values };
      return lockedEvents;
    },
    event: {
      findUnique: async (args) => {
        calls.findEvent = args;
        return event;
      },
    },
    registration: {
      findUnique: async (args) => {
        calls.findRegistration = args;
        return existingRegistration;
      },
      count: async (args) => {
        calls.count = args;
        return registrationCount;
      },
      create: async (args) => {
        calls.create = args;
        return createRegistration(args);
      },
    },
  };
  const originalTransaction = prisma.$transaction;
  prisma.$transaction = (callback) => callback(transaction);

  return {
    calls,
    restore() {
      prisma.$transaction = originalTransaction;
    },
  };
}

test('registers the authenticated user after locking the event and checking capacity', async () => {
  const mocked = mockTransaction();

  try {
    const registration = await registrationService.registerForEvent(
      'event-id',
      'user-id',
    );

    assert.deepEqual(registration, {
      id: 'registration-id',
      userId: 'user-id',
      eventId: 'event-id',
    });
    assert.deepEqual(mocked.calls.findEvent, { where: { id: 'event-id' } });
    assert.deepEqual(mocked.calls.findRegistration, {
      where: { userId_eventId: { userId: 'user-id', eventId: 'event-id' } },
      select: { id: true },
    });
    assert.deepEqual(mocked.calls.count, { where: { eventId: 'event-id' } });
    assert.deepEqual(mocked.calls.create, {
      data: { userId: 'user-id', eventId: 'event-id' },
    });
    assert.deepEqual(mocked.calls.lock.values, ['event-id']);
    assert.match(mocked.calls.lock.strings.join(''), /FOR UPDATE/);
  } finally {
    mocked.restore();
  }
});

test('rejects missing events, closed events, expired deadlines, duplicates, and full capacity', async () => {
  const cases = [
    { lockedEvents: [], event: null, statusCode: 404 },
    {
      event: { ...futureEvent, status: 'Cancelled' },
      statusCode: 409,
    },
    {
      event: {
        ...futureEvent,
        registrationDeadline: new Date('2000-01-01T00:00:00.000Z'),
      },
      statusCode: 409,
    },
    {
      existingRegistration: { id: 'existing-registration' },
      statusCode: 409,
    },
    {
      registrationCount: futureEvent.maxAttendees,
      statusCode: 409,
    },
  ];

  for (const testCase of cases) {
    const mocked = mockTransaction(testCase);
    try {
      await assert.rejects(
        registrationService.registerForEvent('event-id', 'user-id'),
        (error) => error instanceof AppError && error.statusCode === testCase.statusCode,
      );
    } finally {
      mocked.restore();
    }
  }
});

test('maps database duplicate-registration constraint errors to HTTP 409', async () => {
  const duplicateError = new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed.',
    { code: 'P2002', clientVersion: 'test' },
  );
  const mocked = mockTransaction({
    createRegistration: async () => {
      throw duplicateError;
    },
  });

  try {
    await assert.rejects(
      registrationService.registerForEvent('event-id', 'user-id'),
      (error) => error instanceof AppError && error.statusCode === 409,
    );
  } finally {
    mocked.restore();
  }
});

test('cancels only the authenticated user registration', async () => {
  const originalDeleteMany = prisma.registration.deleteMany;
  let where;
  prisma.registration.deleteMany = async (args) => {
    where = args.where;
    return { count: 1 };
  };

  try {
    assert.equal(
      await registrationService.cancelRegistration('event-id', 'user-id'),
      true,
    );
  } finally {
    prisma.registration.deleteMany = originalDeleteMany;
  }

  assert.deepEqual(where, { eventId: 'event-id', userId: 'user-id' });
});

test('returns a user registration list including associated events', async () => {
  const originalFindMany = prisma.registration.findMany;
  const expected = [{ id: 'registration-id', event: { id: 'event-id' } }];
  let args;
  prisma.registration.findMany = async (queryArgs) => {
    args = queryArgs;
    return expected;
  };

  try {
    assert.deepEqual(await registrationService.getMyRegistrations('user-id'), expected);
  } finally {
    prisma.registration.findMany = originalFindMany;
  }

  assert.deepEqual(args, {
    where: { userId: 'user-id' },
    include: { event: true },
    orderBy: { registeredAt: 'desc' },
  });
});

test('returns attendee details without sensitive user fields and checks event ownership', async () => {
  const originalFindUnique = prisma.event.findUnique;
  const originalFindMany = prisma.registration.findMany;
  let selection;
  prisma.event.findUnique = async () => ({
    id: 'event-id',
    organizerId: 'organizer-id',
  });
  prisma.registration.findMany = async (args) => {
    selection = args;
    return [{
      registeredAt: new Date('2026-11-26T08:00:00.000Z'),
      user: {
        id: 'user-id',
        name: 'Goa User',
        email: 'user@example.com',
      },
    }];
  };

  try {
    const attendees = await registrationService.getEventAttendees(
      'event-id',
      'organizer-id',
    );
    assert.deepEqual(attendees, [{
      id: 'user-id',
      name: 'Goa User',
      email: 'user@example.com',
      registeredAt: new Date('2026-11-26T08:00:00.000Z'),
    }]);

    await assert.rejects(
      registrationService.getEventAttendees('event-id', 'other-organizer-id'),
      (error) => error instanceof AppError && error.statusCode === 403,
    );
  } finally {
    prisma.event.findUnique = originalFindUnique;
    prisma.registration.findMany = originalFindMany;
  }

  assert.deepEqual(selection.select.user.select, {
    id: true,
    name: true,
    email: true,
  });
});
