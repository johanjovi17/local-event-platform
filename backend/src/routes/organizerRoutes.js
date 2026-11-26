const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const profileController = require('../controllers/profileController');

const router = express.Router();

router.get(
  '/:id/profile',
  profileController.requireValidOrganizerId,
  profileController.getPublicOrganizerProfile,
);
router.put(
  '/me/profile',
  authenticate,
  authorizeRoles('Organizer'),
  profileController.updateOwnOrganizerProfile,
);

module.exports = router;
