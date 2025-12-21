import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET /api/marketplace/lots
 * Published & public lots
 * Optional filters: country, minScore, maxPrice
 */
router.get('/lots', async (req, res) => {
  try {
    const { country, minScore, maxPrice } = req.query;

    const params = [];
    let i = 1;

    let sql = `
      SELECT
        cl.id,
        cl.lot_name,
        cl.crop_year,
        cl.country,
        cl.region,
        cl.altitude_meters,
        cl.grade,
        cl.certification,
        cl.process,
        cl.variety,
        cl.harvest_month,
        cl.ready_location,
        cl.tasting_notes,
        cl.bags_available,
        cl.bag_size_kg,
        cl.cup_score,
        cl.price_per_kg,
        cl.currency,
        cl.status,
        cl.visibility,
        cl.created_at,
        u.id AS farmer_id,
        u.company_name AS farmer_company,
        u.first_name AS farmer_first_name,
        u.last_name AS farmer_last_name,
        u.country AS farmer_country
      FROM coffee_lots cl
      JOIN users u ON u.id = cl.farmer_id
      WHERE cl.status = 'published'
        AND cl.visibility = 'public'
    `;

    if (country) {
      params.push(country);
      sql += ` AND cl.country = $${i++}`;
    }
    if (minScore) {
      params.push(Number(minScore));
      sql += ` AND cl.cup_score >= $${i++}`;
    }
    if (maxPrice) {
      params.push(Number(maxPrice));
      sql += ` AND (cl.price_per_kg IS NULL OR cl.price_per_kg <= $${i++})`;
    }

    sql += ' ORDER BY cl.created_at DESC NULLS LAST';

    const result = await query(sql, params);
    return res.json({ lots: result.rows || [] });
  } catch (err) {
    console.error('Error in GET /api/marketplace/lots:', err);
    return res.status(500).json({ message: 'Failed to load marketplace lots' });
  }
});

export default router;
