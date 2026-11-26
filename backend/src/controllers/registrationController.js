const registrationService = require('../services/registrationService');

async function registerForEvent(req, res, next) {
  try {
    const registration = await registrationService.registerForEvent(
      req.params.eventId,
      req.user.id,
    );
    return res.status(201).json(registration);
  } catch (error) {
    return next(error);
  }
}

async function cancelRegistration(req, res, next) {
  try {
    const cancelled = await registrationService.cancelRegistration(
      req.params.eventId,
      req.user.id,
    );
    if (!cancelled) {
      return res.status(404).json({ error: 'Registration not found.' });
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

async function getMyRegistrations(req, res, next) {
  try {
    const registrations = await registrationService.getMyRegistrations(req.user.id);
    return res.status(200).json(registrations);
  } catch (error) {
    return next(error);
  }
}

async function getEventAttendees(req, res, next) {
  try {
    const attendees = await registrationService.getEventAttendees(
      req.params.eventId,
      req.user.id,
    );
    return res.status(200).json(attendees);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  cancelRegistration,
  getEventAttendees,
  getMyRegistrations,
  registerForEvent,
};
