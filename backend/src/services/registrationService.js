const { Prisma } = require('@prisma/client');
const prisma = require('../db/prisma');
const AppError = require('../errors/AppError');

function registrationConflict(message) {
  return new AppError(message, 409);
}

function getRegistrationDeadlineExclusive(event) {
  const deadline = new Date(event.registrationDeadline);
  deadline.setUTCDate(deadline.getUTCDate() + 1);
  return deadline;
}

async function registerForEvent(eventId, userId) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const lockedEvents = await transaction.$queryRaw`
        SELECT "id" FROM "Event" WHERE "id" = ${eventId}::uuid FOR UPDATE
      `;
      if (lockedEvents.length === 0) {
        throw new AppError('Event not found.', 404);
      }

      const event = await transaction.event.findUnique({ where: { id: eventId } });
      if (!event) {
        throw new AppError('Event not found.', 404);
      }
      if (event.status !== 'Upcoming') {
        throw registrationConflict('This event is not open for registration.');
      }
      if (new Date() >= getRegistrationDeadlineExclusive(event)) {
        throw registrationConflict('The registration deadline has passed.');
      }

      const existingRegistration = await transaction.registration.findUnique({
        where: { userId_eventId: { userId, eventId } },
        select: { id: true },
      });
      if (existingRegistration) {
        throw registrationConflict('You are already registered for this event.');
      }

      const registrationCount = await transaction.registration.count({
        where: { eventId },
      });
      if (registrationCount >= event.maxAttendees) {
        throw registrationConflict('This event has reached its attendee capacity.');
      }

      return transaction.registration.create({
        data: { userId, eventId },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw registrationConflict('You are already registered for this event.');
    }
    throw error;
  }
}

async function cancelRegistration(eventId, userId) {
  const result = await prisma.registration.deleteMany({
    where: { eventId, userId },
  });
  return result.count > 0;
}

async function getMyRegistrations(userId) {
  return prisma.registration.findMany({
    where: { userId },
    include: { event: true },
    orderBy: { registeredAt: 'desc' },
  });
}

async function getEventAttendees(eventId, organizerId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true },
  });

  if (!event) {
    throw new AppError('Event not found.', 404);
  }
  if (event.organizerId !== organizerId) {
    throw new AppError('You do not have permission to view these attendees.', 403);
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    select: {
      registeredAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { registeredAt: 'asc' },
  });

  return registrations.map(({ user, registeredAt }) => ({ ...user, registeredAt }));
}

module.exports = {
  cancelRegistration,
  getEventAttendees,
  getMyRegistrations,
  registerForEvent,
};
