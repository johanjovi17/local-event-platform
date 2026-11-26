const eventService = require('../services/eventService');

function isValidId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}

function requireValidId(req, res, next) {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'id must be a valid UUID.' });
  }
  return next();
}

async function createEvent(req, res, next) {
  try {
    const event = await eventService.createEvent(req.body, req.user.id);
    return res.status(201).json(event);
  } catch (error) {
    return next(error);
  }
}

async function getAllEvents(req, res, next) {
  try {
    const result = await eventService.getAllEvents(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function getEventById(req, res, next) {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    return res.status(200).json(event);
  } catch (error) {
    return next(error);
  }
}

async function updateEvent(req, res, next) {
  try {
    const event = await eventService.updateEvent(
      req.params.id,
      req.body,
      req.user.id,
    );
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    return res.status(200).json(event);
  } catch (error) {
    return next(error);
  }
}

async function deleteEvent(req, res, next) {
  try {
    const deleted = await eventService.deleteEvent(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  requireValidId,
  updateEvent,
};
