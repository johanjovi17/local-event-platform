const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const AppError = require('../errors/AppError');
const { maxEventImages } = require('../constants/eventImages');

const maxImageSize = 8 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const uploadDirectory = path.resolve(
  process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
);
const eventImagesDirectory = path.join(uploadDirectory, 'events');

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(eventImagesDirectory, { recursive: true })
      .then(() => callback(null, eventImagesDirectory))
      .catch(callback);
  },
  filename(req, file, callback) {
    callback(null, `${randomUUID()}.${allowedTypes.get(file.mimetype)}`);
  },
});

const parser = multer({
  storage,
  limits: { fileSize: maxImageSize, files: maxEventImages },
  fileFilter(req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new AppError('Images must be JPEG, PNG, or WebP files.', 400));
      return;
    }
    callback(null, true);
  },
}).array('images', maxEventImages);

function uploadEventImages(req, res, next) {
  parser(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 8 MB or smaller.'
        : `Choose no more than ${maxEventImages} images.`;
      return next(new AppError(message, error.code === 'LIMIT_FILE_SIZE' ? 413 : 400));
    }
    return next(error);
  });
}

function hasValidImageSignature(buffer, mimetype) {
  if (mimetype === 'image/jpeg') {
    return buffer.length >= 3
      && buffer[0] === 0xff
      && buffer[1] === 0xd8
      && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return buffer.length >= 8
      && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimetype === 'image/webp') {
    return buffer.length >= 12
      && buffer.toString('ascii', 0, 4) === 'RIFF'
      && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

async function validateImageFile(file) {
  const handle = await fs.open(file.path, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return hasValidImageSignature(header.subarray(0, bytesRead), file.mimetype);
  } finally {
    await handle.close();
  }
}

async function removeUploadedFiles(files) {
  const results = await Promise.allSettled(
    files.map((file) => fs.unlink(file.path)),
  );
  results.forEach((result) => {
    if (result.status === 'rejected' && result.reason.code !== 'ENOENT') {
      console.error('Could not remove a rejected event image upload.', result.reason);
    }
  });
}

async function removeStoredEventImages(images) {
  const results = await Promise.allSettled(images.map(async ({ url }) => {
    const prefix = '/uploads/events/';
    if (!url.startsWith(prefix)) return;
    const filename = url.slice(prefix.length);
    if (!filename || path.basename(filename) !== filename) {
      throw new Error('Stored event image URL is invalid.');
    }
    await fs.unlink(path.join(eventImagesDirectory, filename));
  }));
  results.forEach((result) => {
    if (result.status === 'rejected' && result.reason.code !== 'ENOENT') {
      console.error('Could not remove a deleted event image.', result.reason);
    }
  });
}

async function verifyEventImageFiles(req, res, next) {
  try {
    const validity = await Promise.all((req.files || []).map(validateImageFile));
    if (validity.every(Boolean)) return next();
    await removeUploadedFiles(req.files || []);
    return next(new AppError('An uploaded file is not a valid JPEG, PNG, or WebP image.', 400));
  } catch (error) {
    await removeUploadedFiles(req.files || []);
    return next(error);
  }
}

module.exports = {
  eventImagesDirectory,
  removeStoredEventImages,
  removeUploadedFiles,
  uploadDirectory,
  uploadEventImages,
  verifyEventImageFiles,
  hasValidImageSignature,
};
