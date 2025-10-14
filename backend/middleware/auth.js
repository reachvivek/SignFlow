const { verifyToken } = require('../utils/jwt');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Authorization denied.',
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Authorization denied.',
    });
  }
};

// Middleware to check if user is uploader
const isUploader = (req, res, next) => {
  if (req.userRole !== 'UPLOADER') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Uploader role required.',
    });
  }
  next();
};

// Middleware to check if user is signer
const isSigner = (req, res, next) => {
  if (req.userRole !== 'SIGNER') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Signer role required.',
    });
  }
  next();
};

module.exports = { authenticate, isUploader, isSigner };
