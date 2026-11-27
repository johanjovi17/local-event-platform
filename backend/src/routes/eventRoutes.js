const express = require('express');
const eventController = require('../controllers/eventController');
const registrationController = require('../controllers/registrationController');
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  uploadEventImages,
  verifyEventImageFiles,
} = require('../middleware/eventImageUpload');

const router = express.Router();

router
  .route('/')
  .post(authenticate, authorizeRoles('Organizer'), eventController.createEvent)
  .get(eventController.getAllEvents);

router
  .route('/:id')
  .get(eventController.requireValidId, eventController.getEventById)
  .put(
    authenticate,
    authorizeRoles('Organizer'),
    eventController.requireValidId,
    eventController.updateEvent,
  )
  .delete(
    authenticate,
    authorizeRoles('Organizer'),
    eventController.requireValidId,
    eventController.deleteEvent,
  );

router.post(
  '/:eventId/registrations',
  authenticate,
  authorizeRoles('User'),
  eventController.requireValidEventId,
  registrationController.registerForEvent,
);
router.delete(
  '/:eventId/registrations',
  authenticate,
  authorizeRoles('User'),
  eventController.requireValidEventId,
  registrationController.cancelRegistration,
);
router.post(
  '/:eventId/images',
  authenticate,
  authorizeRoles('Organizer'),
  eventController.requireValidEventId,
  uploadEventImages,
  verifyEventImageFiles,
  eventController.addEventImages,
);
router.get(
  '/:eventId/attendees',
  authenticate,
  authorizeRoles('Organizer'),
  eventController.requireValidEventId,
  registrationController.getEventAttendees,
);

module.exports = router;
