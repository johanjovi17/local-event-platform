const profileService = require('../services/profileService');

function isValidId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}

function requireValidOrganizerId(req, res, next) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'id must be a valid UUID.' });
  }
  return next();
}

async function getOwnProfile(req, res, next) {
  try {
    const profile = await profileService.getOwnProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json(profile);
  } catch (error) {
    return next(error);
  }
}

async function updateOwnProfile(req, res, next) {
  try {
    const profile = await profileService.updateOwnProfile(
      req.user.id,
      req.body,
      req.user.role === 'Organizer',
    );
    if (!profile) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json(profile);
  } catch (error) {
    return next(error);
  }
}

async function updateOwnOrganizerProfile(req, res, next) {
  try {
    const profile = await profileService.updateOwnProfile(
      req.user.id,
      req.body,
      true,
      false,
    );
    if (!profile) {
      return res.status(404).json({ error: 'Organizer not found.' });
    }
    return res.status(200).json(profile);
  } catch (error) {
    return next(error);
  }
}

async function getPublicOrganizerProfile(req, res, next) {
  try {
    const profile = await profileService.getPublicOrganizerProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Organizer not found.' });
    }
    return res.status(200).json(profile);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOwnProfile,
  getPublicOrganizerProfile,
  requireValidOrganizerId,
  updateOwnOrganizerProfile,
  updateOwnProfile,
};
