const express = require('express');
const eventController = require('../controllers/eventController');

const router = express.Router();

router
  .route('/')
  .post(eventController.createEvent)
  .get(eventController.getAllEvents);

router
  .route('/:id')
  .all(eventController.requireValidId)
  .get(eventController.getEventById)
  .put(eventController.updateEvent)
  .delete(eventController.deleteEvent);

module.exports = router;
