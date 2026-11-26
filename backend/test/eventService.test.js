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
