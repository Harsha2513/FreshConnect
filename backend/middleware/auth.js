const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token required"
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: "Invalid authentication token"
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");
      return res.status(500).json({
        message: "Server configuration error"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });

    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        message: "Invalid authentication token"
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};