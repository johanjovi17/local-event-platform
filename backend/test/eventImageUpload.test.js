const test = require('node:test');
const assert = require('node:assert/strict');
const { hasValidImageSignature } = require('../src/middleware/eventImageUpload');

test('accepts supported image file signatures', () => {
  assert.equal(
    hasValidImageSignature(
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      'image/jpeg',
    ),
    true,
  );
  assert.equal(
    hasValidImageSignature(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'image/png',
    ),
    true,
  );
  assert.equal(
    hasValidImageSignature(
      Buffer.from('RIFF0000WEBP'),
      'image/webp',
    ),
    true,
  );
});

test('rejects unsupported and mismatched image signatures', () => {
  assert.equal(hasValidImageSignature(Buffer.from('<svg/>'), 'image/svg+xml'), false);
  assert.equal(hasValidImageSignature(Buffer.from('<svg/>'), 'image/png'), false);
  assert.equal(hasValidImageSignature(Buffer.from([0xff, 0xd8]), 'image/jpeg'), false);
});
