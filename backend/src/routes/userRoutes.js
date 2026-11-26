const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const registrationController = require('../controllers/registrationController');

const router = express.Router();

router.get(
  '/me/registrations',
  authenticate,
  authorizeRoles('User'),
  registrationController.getMyRegistrations,
);

module.exports = router;
