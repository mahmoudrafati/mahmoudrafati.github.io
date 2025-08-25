/**
 * Authentication routes for NLPDS Learning Platform
 * Simple JWT-based auth with user registration and login
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const db = new DatabaseManager();

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-50 characters, alphanumeric with _ or -'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('displayName')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .withMessage('Display name max 100 characters')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password, displayName } = req.body;

    // Check if user already exists
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        error: 'Username already taken',
        field: 'username'
      });
    }

    if (email) {
      const existingEmail = await db.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          error: 'Email already registered',
          field: 'email'
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = await db.createUser({
      username,
      email: email || null,
      passwordHash,
      displayName: displayName || username
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId, username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return user data (without password)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        username,
        email: email || null,
        displayName: displayName || username,
        createdAt: new Date().toISOString(),
        showInLeaderboard: true
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('Username required'),
  body('password')
    .notEmpty()
    .withMessage('Password required')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password } = req.body;

    // Get user from database
    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password incorrect'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password incorrect'
      });
    }

    // Update last active timestamp
    await db.updateUserLastActive(user.id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return user data (without password)
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        showInLeaderboard: user.show_in_leaderboard,
        lastActive: user.last_active,
        settings: user.settings || {}
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    });
  }
});

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        showInLeaderboard: user.show_in_leaderboard,
        lastActive: user.last_active,
        createdAt: user.created_at,
        settings: user.settings || {}
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user data',
      message: 'Internal server error'
    });
  }
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', authenticateToken, [
  body('displayName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Display name must be 1-100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('showInLeaderboard')
    .optional()
    .isBoolean()
    .withMessage('Show in leaderboard must be boolean'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { displayName, email, showInLeaderboard, settings } = req.body;
    const userId = req.user.userId;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          error: 'Email already taken by another user',
          field: 'email'
        });
      }
    }

    // Update user profile
    await db.updateUserProfile(userId, {
      displayName,
      email,
      showInLeaderboard,
      settings
    });

    // Get updated user data
    const updatedUser = await db.getUserById(userId);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.display_name,
        showInLeaderboard: updatedUser.show_in_leaderboard,
        lastActive: updatedUser.last_active,
        createdAt: updatedUser.created_at,
        settings: updatedUser.settings || {}
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'Internal server error'
    });
  }
});

/**
 * Refresh JWT token
 * POST /api/auth/refresh
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const { userId, username } = req.user;

    // Generate new token
    const token = jwt.sign(
      { userId, username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'Internal server error'
    });
  }
});

/**
 * Logout (client-side token removal, server-side is stateless)
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Update last active timestamp
    await db.updateUserLastActive(req.user.userId);

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error'
    });
  }
});

export default router;
