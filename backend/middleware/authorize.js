// Role-based authorization. Must be used after the JWT auth middleware.
module.exports = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "You are not allowed to perform this action." });
  }
  next();
};
