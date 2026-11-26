const test = require('node:test');
const assert = require('node:assert/strict');
const eventController = require('../src/controllers/eventController');
const eventService = require('../src/services/eventService');

test('passes authenticated ownership, not request ownership, to event creation', async () => {
  const originalCreateEvent = eventService.createEvent;
  let receivedInput;
  let receivedOrganizerId;
  eventService.createEvent = async (input, organizerId) => {
    receivedInput = input;
    receivedOrganizerId = organizerId;
    return { id: 'event-id' };
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

  try {
    await eventController.createEvent(
      {
        body: { title: 'Event', organizerId: 'untrusted-organizer-id' },
        user: { id: 'authenticated-organizer-id' },
      },
      res,
      (error) => {
        throw error;
      },
    );
  } finally {
    eventService.createEvent = originalCreateEvent;
  }

  assert.equal(receivedInput.organizerId, 'untrusted-organizer-id');
  assert.equal(receivedOrganizerId, 'authenticated-organizer-id');
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { id: 'event-id' });
});
