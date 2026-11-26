const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Prisma } = require('@prisma/client');
const prisma = require('../db/prisma');
const AppError = require('../errors/AppError');
const { getJwtExpiresIn, getJwtSecret } = require('../config/jwt');

const roles = new Set(['User', 'Organizer']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const bcryptMaxPasswordBytes = 72;
const publicUserFields = {
  id: true,
  name: true,
  email: true,
  role: true,
};

function validateRegisterInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }

  const errors = [];
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    errors.push('name is required and must not be empty.');
  } else if (input.name.trim().length > 120) {
    errors.push('name must be 120 characters or fewer.');
  }

  if (typeof input.email !== 'string' || !emailPattern.test(input.email.trim())) {
    errors.push('A valid email is required.');
  }

  if (typeof input.password !== 'string' || input.password.length < 8) {
    errors.push('password must be at least 8 characters long.');
  } else if (Buffer.byteLength(input.password, 'utf8') > bcryptMaxPasswordBytes) {
    errors.push('password must be no more than 72 bytes.');
  }

  if (!roles.has(input.role)) {
    errors.push('role must be either User or Organizer.');
  }

  if (errors.length > 0) {
    throw new AppError('Registration validation failed.', 400, errors);
  }

  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: input.role,
  };
}

function validateLoginInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError('Request body must be a JSON object.', 400);
  }

  const errors = [];
  if (typeof input.email !== 'string' || !emailPattern.test(input.email.trim())) {
    errors.push('A valid email is required.');
  }
  if (typeof input.password !== 'string' || input.password.length === 0) {
    errors.push('password is required.');
  }

  if (errors.length > 0) {
    throw new AppError('Login validation failed.', 400, errors);
  }

  return {
    email: input.email.trim().toLowerCase(),
    password: input.password,
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function register(input) {
  const data = validateRegisterInput(input);
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError('Email is already registered.', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      },
      select: publicUserFields,
    });
    return toPublicUser(user);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError('Email is already registered.', 409);
    }
    throw error;
  }
}

async function login(input) {
  const credentials = validateLoginInput(input);
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
  });

  if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = jwt.sign(
    { email: user.email, role: user.role },
    getJwtSecret(),
    {
      algorithm: 'HS256',
      subject: user.id,
      expiresIn: getJwtExpiresIn(),
    },
  );

  return { token, user: toPublicUser(user) };
}

async function getCurrentUser(id) {
  return prisma.user.findUnique({
    where: { id },
    select: publicUserFields,
  });
}

module.exports = {
  getCurrentUser,
  login,
  register,
  toPublicUser,
  validateLoginInput,
  validateRegisterInput,
};
