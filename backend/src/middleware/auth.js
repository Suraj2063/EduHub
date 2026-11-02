const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "eduhub_super_secret_key_2024";

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Please log in to continue.",
      result: null,
    });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please log in again.",
      result: null,
    });
  }
};

module.exports = { verifyToken };

