import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

/**
 * POST /api/contact
 * Public: store contact messages
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, reason, phone, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    const result = await query(
      `INSERT INTO contact_messages (name, email, reason, phone, message, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, created_at`,
      [name.trim(), email.trim().toLowerCase(), (reason || '').trim(), (phone || '').trim(), message.trim(), ip, userAgent]
    );

    return res.status(201).json({ ok: true, id: result.rows[0].id, created_at: result.rows[0].created_at });
  } catch (err) {
    console.error('Contact create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/contact/messages
 * Admin-only: list recent messages
 */
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    if ((req.user?.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 500);

    const result = await query(
      `SELECT id, name, email, reason, phone, message, created_at
       FROM contact_messages
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return res.json({ ok: true, items: result.rows });
  } catch (err) {
    console.error('Contact list error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
