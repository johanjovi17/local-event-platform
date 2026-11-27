const test = require('node:test');
const assert = require('node:assert/strict');
const AppError = require('../src/errors/AppError');
const prisma = require('../src/db/prisma');
const eventService = require('../src/services/eventService');
const { validateEventInput } = eventService;

const validEvent = {
  title: 'Community meetup',
  description: 'Meet your neighbors.',
  category: 'Community',
  location: 'Town Hall',
  eventDate: '2027-06-15',
  startTime: '09:30',
  endTime: '11:00',
  maxAttendees: 25,
  registrationDeadline: '2027-06-14',
};

test('validates and normalizes event input without adding a status', () => {
  const data = validateEventInput(validEvent);

  assert.equal(data.title, validEvent.title);
  assert.equal(data.category, validEvent.category);
  assert.equal(data.eventDate.toISOString(), '2027-06-15T00:00:00.000Z');
  assert.equal(data.status, undefined);
});

test('rejects unsupported categories and invalid event constraints', () => {
  assert.throws(
    () =>
      validateEventInput({
        ...validEvent,
        category: 'Unsupported',
        maxAttendees: 0,
        endTime: '09:30',
        registrationDeadline: '2027-06-16',
      }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.details.length, 4);
      return true;
    },
  );
});

test('rejects impossible dates and missing required fields', () => {
  assert.throws(
    () =>
      validateEventInput({
        ...validEvent,
        eventDate: '2027-02-29',
        title: '   ',
        registrationDeadline: undefined,
      }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.ok(error.details.some((message) => message.includes('eventDate')));
      assert.ok(
        error.details.some((message) => message.includes('registrationDeadline')),
      );
      assert.ok(error.details.some((message) => message.includes('title')));
      return true;
    },
  );
});

test('creates events using the authenticated organizer instead of request ownership', async () => {
  const originalCreate = prisma.event.create;
  let createdData;
  prisma.event.create = async ({ data }) => {
    createdData = data;
    return data;
  };

  try {
    await eventService.createEvent(
      { ...validEvent, organizerId: 'untrusted-organizer-id' },
      'authenticated-organizer-id',
    );
  } finally {
    prisma.event.create = originalCreate;
  }

  assert.equal(createdData.organizerId, 'authenticated-organizer-id');
});

test('prevents a non-owner from updating or deleting an event', async () => {
  const originalFindUnique = prisma.event.findUnique;
  const originalUpdate = prisma.event.update;
  const originalDeleteMany = prisma.event.deleteMany;
  prisma.event.findUnique = async () => ({ organizerId: 'event-owner-id' });
  prisma.event.update = async () => {
    throw new Error('An unauthorized update was attempted.');
  };
  prisma.event.deleteMany = async () => {
    throw new Error('An unauthorized delete was attempted.');
  };

  try {
    await assert.rejects(
      eventService.updateEvent('event-id', validEvent, 'other-organizer-id'),
      (error) => error instanceof AppError && error.statusCode === 403,
    );
    await assert.rejects(
      eventService.deleteEvent('event-id', 'other-organizer-id'),
      (error) => error instanceof AppError && error.statusCode === 403,
    );
  } finally {
    prisma.event.findUnique = originalFindUnique;
    prisma.event.update = originalUpdate;
    prisma.event.deleteMany = originalDeleteMany;
  }
});

test('lists events with combined filters, ascending dates, pagination, and total count', async () => {
  const originalFindMany = prisma.event.findMany;
  const originalCount = prisma.event.count;
  let findManyArgs;
  let countArgs;
  prisma.event.findMany = async (args) => {
    findManyArgs = args;
    return [{ id: 'event-id', title: 'Goa Music Festival' }];
  };
  prisma.event.count = async (args) => {
    countArgs = args;
    return 35;
  };

  try {
    const result = await eventService.getAllEvents({
      page: '2',
      pageSize: '10',
      search: 'Goa',
      category: 'Music',
      location: 'Panaji',
      dateFrom: '2027-01-01',
      dateTo: '2027-12-31',
      status: 'Upcoming',
    });

    assert.deepEqual(result, {
      data: [{ id: 'event-id', title: 'Goa Music Festival' }],
      pagination: {
        currentPage: 2,
        pageSize: 10,
        totalRecords: 35,
        totalPages: 4,
      },
    });
    assert.deepEqual(findManyArgs, {
      where: {
        OR: [
          { title: { contains: 'Goa', mode: 'insensitive' } },
          { description: { contains: 'Goa', mode: 'insensitive' } },
        ],
        category: 'Music',
        location: { contains: 'Panaji', mode: 'insensitive' },
        eventDate: {
          gte: new Date('2027-01-01T00:00:00.000Z'),
          lte: new Date('2027-12-31T00:00:00.000Z'),
        },
        status: 'Upcoming',
      },
      orderBy: { eventDate: 'asc' },
      skip: 10,
      take: 10,
      include: { images: { orderBy: { position: 'asc' } } },
    });
    assert.deepEqual(countArgs, { where: findManyArgs.where });
  } finally {
    prisma.event.findMany = originalFindMany;
    prisma.event.count = originalCount;
  }
});

test('uses default pagination and returns zero pages when no events match', async () => {
  const originalFindMany = prisma.event.findMany;
  const originalCount = prisma.event.count;
  let findManyArgs;
  prisma.event.findMany = async (args) => {
    findManyArgs = args;
    return [];
  };
  prisma.event.count = async () => 0;

  try {
    const result = await eventService.getAllEvents({});

    assert.deepEqual(findManyArgs, {
      where: {},
      orderBy: { eventDate: 'asc' },
      skip: 0,
      take: 10,
      include: { images: { orderBy: { position: 'asc' } } },
    });
    assert.deepEqual(result.pagination, {
      currentPage: 1,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 0,
    });
    assert.deepEqual(result.data, []);
  } finally {
    prisma.event.findMany = originalFindMany;
    prisma.event.count = originalCount;
  }
});

test('rejects image uploads that exceed the per-event gallery limit', async () => {
  await assert.rejects(
    eventService.addEventImages(
      'event-id',
      'organizer-id',
      Array.from({ length: eventService.maxEventImages + 1 }, (_, index) => ({
        filename: `image-${index}.jpg`,
      })),
    ),
    (error) => error instanceof AppError && error.statusCode === 400,
  );
});

test('stores uploaded event images in upload order for the owning organizer', async () => {
  const originalTransaction = prisma.$transaction;
  let createdImages;
  prisma.$transaction = async (callback) => callback({
    $queryRaw: async () => [{ id: 'event-id' }],
    event: {
      findUnique: async () => ({ organizerId: 'organizer-id' }),
    },
    eventImage: {
      count: async () => 2,
      createMany: async ({ data }) => {
        createdImages = data;
      },
      findMany: async () => createdImages,
    },
  });

  try {
    const images = await eventService.addEventImages('event-id', 'organizer-id', [
      { filename: 'first.jpg' },
      { filename: 'second.png' },
    ]);

    assert.deepEqual(images, [
      { eventId: 'event-id', url: '/uploads/events/first.jpg', position: 2 },
      { eventId: 'event-id', url: '/uploads/events/second.png', position: 3 },
    ]);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test('rejects image uploads for events owned by another organizer', async () => {
  const originalTransaction = prisma.$transaction;
  prisma.$transaction = async (callback) => callback({
    $queryRaw: async () => [{ id: 'event-id' }],
    event: {
      findUnique: async () => ({ organizerId: 'owner-id' }),
    },
    eventImage: {
      count: async () => {
        throw new Error('Image capacity must not be checked for another organizer.');
      },
    },
  });

  try {
    await assert.rejects(
      eventService.addEventImages('event-id', 'other-organizer-id', [
        { filename: 'image.jpg' },
      ]),
      (error) => error instanceof AppError && error.statusCode === 403,
    );
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test('rejects invalid pagination, status, date range, and oversized page size', async () => {
  for (const query of [
    { page: '0' },
    { page: '1.5' },
    { pageSize: '-1' },
    { pageSize: '51' },
    { status: 'Unknown' },
    { dateFrom: '2027-02-30' },
    { dateFrom: '2027-02-01', dateTo: '2027-01-31' },
  ]) {
    assert.throws(
      () => eventService.validateEventQuery(query),
      (error) => error instanceof AppError && error.statusCode === 400,
    );
  }
});
