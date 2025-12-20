import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

function getJwtSecret() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production');
  }
  return process.env.JWT_SECRET || 'dev-secret-change-me';
}

function generateToken(user) {
  const secret = getJwtSecret();
  const payload = { userId: user.id, role: user.role, email: user.email };
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, companyName, country, phone } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password and role are required' });
    }

    const allowedRoles = ['farmer', 'trader', 'logistics', 'roaster', 'admin', 'educator'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const insert = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, company_name, country, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, email, role, first_name, last_name, company_name, phone, country, created_at`,
      [
        normalizedEmail,
        passwordHash,
        role,
        firstName || null,
        lastName || null,
        companyName || null,
        country || null,
        phone || null
      ]
    );

    const user = insert.rows[0];
    const token = generateToken(user);

    return res.status(201).json({ message: 'Account created', user, token });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await query(
      `SELECT id, email, role, password_hash, first_name, last_name, company_name, phone, country
       FROM users WHERE email = $1 LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid email or password' });

    const row = result.rows[0];
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    const user = {
      id: row.id,
      email: row.email,
      role: row.role,
      first_name: row.first_name,
      last_name: row.last_name,
      company_name: row.company_name,
      phone: row.phone,
      country: row.country
    };

    const token = generateToken(user);

    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    return res.json({ message: 'Login successful', user, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

// Password reset (dev-friendly; for production store in DB)
const resetTokens = new Map(); // token -> { userId, expiresAt }

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ message: 'If that email exists, reset instructions were sent.' });

    const normalizedEmail = String(email).trim().toLowerCase();

    const result = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (result.rows.length === 0) return res.json({ message: 'If that email exists, reset instructions were sent.' });

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000;

    resetTokens.set(token, { userId, expiresAt });
    setTimeout(() => resetTokens.delete(token), 60 * 60 * 1000);

    console.log(`Password reset token for ${normalizedEmail}: ${token}`);

    return res.json({
      message: 'If that email exists, reset instructions were sent.',
      token: process.env.NODE_ENV === 'development' ? token : undefined
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and newPassword are required' });

    const data = resetTokens.get(token);
    if (!data) return res.status(400).json({ message: 'Invalid or expired token' });
    if (Date.now() > data.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({ message: 'Token expired' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, data.userId]);

    resetTokens.delete(token);
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, role, first_name, last_name, company_name, phone, country FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
