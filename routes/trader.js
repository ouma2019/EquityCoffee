import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

/**
 * GET /api/trader/
 */
router.get('/', (req, res) => {
  return res.json({ message: 'Trader API root' });
});

/**
 * GET /api/trader/offers
 * Optional query:
 *  - lotId=<uuid>
 *  - buyerId=<uuid>
 *  - status=<status>
 */
router.get('/offers', async (req, res) => {
  try {
    const { lotId, buyerId, status } = req.query;
    const conditions = [];
    const values = [];

    if (lotId) {
      conditions.push('lot_id = $' + (values.length + 1));
      values.push(lotId);
    }
    if (buyerId) {
      conditions.push('buyer_id = $' + (values.length + 1));
      values.push(buyerId);
    }
    if (status) {
      conditions.push('status = $' + (values.length + 1));
      values.push(status);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `
      SELECT
        id,
        lot_id,
        buyer_id,
        price_per_kg,
        currency,
        incoterm,
        message,
        status,
        created_at,
        updated_at
      FROM offers
      ${whereClause}
      ORDER BY created_at DESC
    `;
    const result = await query(sql, values);
    return res.json({ offers: result.rows });
  } catch (err) {
    console.error('List offers error:', err);
    return res.status(500).json({ message: 'Failed to load offers' });
  }
});

/**
 * POST /api/trader/offers
 * Create a new offer for a lot
 */
router.post('/offers', authenticateToken, async (req, res) => {
  try {
    const { lotId, pricePerKg, currency, incoterm, message } = req.body;
    const buyerId = req.user?.userId;

    if (!buyerId) {
      return res.status(400).json({ message: 'Missing buyer context' });
    }
    if (!lotId || !pricePerKg) {
      return res.status(400).json({ message: 'lotId and pricePerKg are required' });
    }

    const sql = `
      INSERT INTO offers (
        lot_id,
        buyer_id,
        price_per_kg,
        currency,
        incoterm,
        message
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `;
    const values = [
      lotId,
      buyerId,
      pricePerKg,
      currency || 'USD',
      incoterm || null,
      message || null
    ];

    const result = await query(sql, values);
    return res.status(201).json({ offer: result.rows[0] });
  } catch (err) {
    console.error('Create offer error:', err);
    return res.status(500).json({ message: 'Failed to create offer' });
  }
});

export default router;
