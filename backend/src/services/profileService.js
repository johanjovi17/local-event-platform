const { Prisma } = require('@prisma/client');
const prisma = require('../db/prisma');
const AppError = require('../errors/AppError');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userProfileFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  organizationName: true,
  description: true,
  contactInfo: true,
};

function validateProfileInput(input, isOrganizer, allowEmail = true) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }

  const allowedFields = new Set(['name', ...(allowEmail ? ['email'] : [])]);
  if (isOrganizer) {
    for (const field of ['organizationName', 'description', 'contactInfo']) {
      allowedFields.add(field);
    }
  }
  const errors = [];
  const data = {};

  for (const field of ['id', 'role', 'password', 'passwordHash']) {
    if (Object.hasOwn(input, field)) {
      errors.push(`${field} cannot be changed through this endpoint.`);
    }
  }

  for (const field of Object.keys(input)) {
    if (!allowedFields.has(field) && !['id', 'role', 'password', 'passwordHash'].includes(field)) {
      errors.push(`${field} is not a permitted profile field.`);
    }
  }

  if (!Object.keys(input).some((field) => allowedFields.has(field))) {
    errors.push('At least one permitted profile field must be provided.');
  }

  if (Object.hasOwn(input, 'name')) {
    if (typeof input.name !== 'string' || input.name.trim() === '') {
      errors.push('name must be a non-empty string.');
    } else if (input.name.trim().length > 120) {
      errors.push('name must be 120 characters or fewer.');
    } else {
      data.name = input.name.trim();
    }
  }

  if (allowEmail && Object.hasOwn(input, 'email')) {
    if (typeof input.email !== 'string' || !emailPattern.test(input.email.trim())) {
      errors.push('A valid email is required.');
    } else {
      data.email = input.email.trim().toLowerCase();
    }
  }

  if (isOrganizer) {
    for (const [field, maxLength] of [
      ['organizationName', 160],
      ['description', null],
      ['contactInfo', 255],
    ]) {
      if (!Object.hasOwn(input, field)) {
        continue;
      }

      const value = input[field];
      if (value !== null && typeof value !== 'string') {
        errors.push(`${field} must be a string or null.`);
      } else if (value !== null && maxLength && value.length > maxLength) {
        errors.push(`${field} must be ${maxLength} characters or fewer.`);
      } else {
        data[field] = typeof value === 'string' ? value.trim() : null;
      }
    }
  }

  if (errors.length > 0) {
    throw new AppError('Profile validation failed.', 400, errors);
  }

  return data;
}

async function getOwnProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userProfileFields,
      registrations: {
        select: {
          id: true,
          registeredAt: true,
          event: true,
        },
      },
      events: true,
    },
  });

  if (!user) {
    return null;
  }

  const { registrations, events, ...profile } = user;
  return user.role === 'Organizer'
    ? { ...profile, events }
    : { ...profile, registrations };
}

async function updateOwnProfile(userId, input, isOrganizer, allowEmail = true) {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!existingUser) {
    return null;
  }

  const data = validateProfileInput(input, isOrganizer, allowEmail);

  if (data.email) {
    const userWithEmail = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (userWithEmail && userWithEmail.id !== userId) {
      throw new AppError('Email is already in use.', 409);
    }
  }

  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { ...data, updatedAt: new Date() },
      select: userProfileFields,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      data.email
    ) {
      throw new AppError('Email is already in use.', 409);
    }
    throw error;
  }
}

async function getPublicOrganizerProfile(organizerId) {
  const organizer = await prisma.user.findFirst({
    where: { id: organizerId, role: 'Organizer' },
    select: {
      id: true,
      name: true,
      organizationName: true,
      description: true,
      contactInfo: true,
      events: true,
    },
  });

  if (!organizer) {
    return null;
  }

  const { events, ...profile } = organizer;
  return { profile, events };
}

module.exports = {
  getOwnProfile,
  getPublicOrganizerProfile,
  updateOwnProfile,
  validateProfileInput,
};
