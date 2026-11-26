const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const registrationController = require('../controllers/registrationController');
const profileController = require('../controllers/profileController');

const router = express.Router();

router
  .route('/me/profile')
  .get(authenticate, profileController.getOwnProfile)
  .put(authenticate, profileController.updateOwnProfile);

router.get(
  '/me/registrations',
  authenticate,
  authorizeRoles('User'),
  registrationController.getMyRegistrations,
);

module.exports = router;
