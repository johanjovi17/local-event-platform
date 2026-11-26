const express = require('express');
const eventController = require('../controllers/eventController');
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');

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

module.exports = router;
