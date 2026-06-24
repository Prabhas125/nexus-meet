/**
 * Authentication Controller
 * Handles user registration, login, and profile
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

/**
 * Generate JWT token for a user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Hash password with bcrypt (12 rounds for production strength)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current user profile (protected)
 */
const getProfile = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, login, getProfile };
