const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEventInput } = require('../src/services/eventService');

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
