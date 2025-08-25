/**
 * Authentication middleware for JWT token verification
 */

import jwt from 'jsonwebtoken';

/**
 * Middleware to authenticate JWT tokens
 * Adds user info to req.user if token is valid
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Authentication token is invalid'
      });
    } else {
      console.error('JWT verification error:', error);
      return res.status(500).json({
        error: 'Authentication failed',
        message: 'Internal server error'
      });
    }
  }
}

/**
 * Optional authentication middleware
 * Adds user info to req.user if token is valid, but doesn't fail if no token
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    req.user = null;
  }

  next();
}
