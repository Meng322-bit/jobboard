const jwt = require('jsonwebtoken');

// Usage: verifyToken('employer') lets only employers through
module.exports = function verifyToken(requiredRole) {
  return (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = header.split(' ')[1]; // "Bearer abc123" -> "abc123"
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: 'Access denied for your role' });
      }

      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
};