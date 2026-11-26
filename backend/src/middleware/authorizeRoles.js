function authorizeRoles(allowedRoles) {
  const roles = new Set(
    Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles],
  );

  return function authorizeRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.has(req.user.role)) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to perform this action.' });
    }

    return next();
  };
}

module.exports = authorizeRoles;
