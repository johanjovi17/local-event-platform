const { Prisma } = require('@prisma/client');
const prisma = require('../db/prisma');
const AppError = require('../errors/AppError');

const categories = new Set([
  'Music',
  'Technology',
  'Arts',
  'Sports',
  'Food',
  'Business',
  'Education',
  'Community',
  'Other',
]);

const statuses = new Set(['Upcoming', 'Ongoing', 'Completed', 'Cancelled']);
const requiredFields = [
  'title',
  'description',
  'category',
  'location',
  'eventDate',
  'startTime',
  'endTime',
  'maxAttendees',
  'registrationDeadline',
];

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function dateToDatabaseValue(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function timeToDatabaseValue(value) {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function validateEventInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }

  const errors = [];
  for (const field of requiredFields) {
    if (input[field] === undefined || input[field] === null) {
      errors.push(`${field} is required.`);
    }
  }

  for (const field of ['title', 'description', 'location']) {
    if (typeof input[field] === 'string' && input[field].trim() === '') {
      errors.push(`${field} must not be empty.`);
    } else if (input[field] !== undefined && typeof input[field] !== 'string') {
      errors.push(`${field} must be a string.`);
    }
  }

  if (input.category !== undefined && !categories.has(input.category)) {
    errors.push(`category must be one of: ${Array.from(categories).join(', ')}.`);
  }

  if (
    input.maxAttendees !== undefined &&
    (!Number.isInteger(input.maxAttendees) || input.maxAttendees <= 0)
  ) {
    errors.push('maxAttendees must be a positive integer.');
  }

  if (input.eventDate !== undefined && !isValidDate(input.eventDate)) {
    errors.push('eventDate must be a valid date in YYYY-MM-DD format.');
  }

  if (
    input.registrationDeadline !== undefined &&
    !isValidDate(input.registrationDeadline)
  ) {
    errors.push('registrationDeadline must be a valid date in YYYY-MM-DD format.');
  }

  if (input.startTime !== undefined && !isValidTime(input.startTime)) {
    errors.push('startTime must be a valid time in HH:mm format.');
  }

  if (input.endTime !== undefined && !isValidTime(input.endTime)) {
    errors.push('endTime must be a valid time in HH:mm format.');
  }

  if (
    isValidTime(input.startTime) &&
    isValidTime(input.endTime) &&
    input.endTime <= input.startTime
  ) {
    errors.push('endTime must be later than startTime.');
  }

  if (
    isValidDate(input.eventDate) &&
    isValidDate(input.registrationDeadline) &&
    input.registrationDeadline > input.eventDate
  ) {
    errors.push('registrationDeadline must not be later than eventDate.');
  }

  if (input.status !== undefined && !statuses.has(input.status)) {
    errors.push(`status must be one of: ${Array.from(statuses).join(', ')}.`);
  }

  if (errors.length > 0) {
    throw new AppError('Event validation failed.', 400, errors);
  }

  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    location: input.location.trim(),
    eventDate: dateToDatabaseValue(input.eventDate),
    startTime: timeToDatabaseValue(input.startTime),
    endTime: timeToDatabaseValue(input.endTime),
    maxAttendees: input.maxAttendees,
    registrationDeadline: dateToDatabaseValue(input.registrationDeadline),
    ...(input.status !== undefined ? { status: input.status } : {}),
  };
}

async function createEvent(input, organizerId) {
  const data = validateEventInput(input);
  return prisma.event.create({ data: { ...data, organizerId } });
}

async function getAllEvents() {
  return prisma.event.findMany();
}

async function getEventById(id) {
  return prisma.event.findUnique({ where: { id } });
}

async function updateEvent(id, input, organizerId) {
  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return null;
  }
  if (existingEvent.organizerId !== organizerId) {
    throw new AppError('You do not have permission to modify this event.', 403);
  }

  const data = validateEventInput(input);

  try {
    return await prisma.event.update({
      where: { id, organizerId },
      data: { ...data, updatedAt: new Date() },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
}

async function deleteEvent(id, organizerId) {
  const existingEvent = await prisma.event.findUnique({ where: { id } });
  if (!existingEvent) {
    return false;
  }
  if (existingEvent.organizerId !== organizerId) {
    throw new AppError('You do not have permission to modify this event.', 403);
  }

  const result = await prisma.event.deleteMany({ where: { id, organizerId } });
  return result.count > 0;
}

module.exports = {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  validateEventInput,
};
