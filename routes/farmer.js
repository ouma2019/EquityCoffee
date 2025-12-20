import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

function requireFarmerOrAdmin(req, res, next) {
  if (!req.user || !req.user.role) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: farmer role required' });
  }
  return next();
}

/**
 * GET /api/farmer/
 */
router.get('/', (req, res) => {
  return res.json({ message: 'Farmer API root' });
});

/**
 * GET /api/farmer/lots
 * Returns lots owned by the authenticated farmer (or all lots if admin, with optional farmerId filter)
 */
router.get('/lots', authenticateToken, requireFarmerOrAdmin, async (req, res) => {
  try {
    const { status, farmerId } = req.query;

    const params = [];
    let i = 1;

    let sql = `
      SELECT
        id, farmer_id, lot_name, crop_year, country, region, altitude_meters,
        grade, certification, process, variety, harvest_month, ready_location,
        tasting_notes, bags_available, bag_size_kg, cup_score, price_per_kg, currency,
        status, visibility, created_at, updated_at
      FROM coffee_lots
      WHERE 1=1
    `;

    if (req.user.role === 'admin' && farmerId) {
      params.push(farmerId);
      sql += ` AND farmer_id = $${i++}`;
    } else if (req.user.role !== 'admin') {
      params.push(req.user.userId);
      sql += ` AND farmer_id = $${i++}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND status = $${i++}`;
    }

    sql += ' ORDER BY created_at DESC NULLS LAST';

    const result = await query(sql, params);
    return res.json({ lots: result.rows || [] });
  } catch (err) {
    console.error('GET /api/farmer/lots error:', err);
    return res.status(500).json({ message: 'Failed to load lots' });
  }
});

/**
 * POST /api/farmer/lots
 * Create a lot for authenticated farmer
 */
router.post('/lots', authenticateToken, requireFarmerOrAdmin, async (req, res) => {
  try {
    const farmerId = (req.user.role === 'admin' && req.body.farmerId) ? req.body.farmerId : req.user.userId;

    const {
      lotName, cropYear, country, region, altitudeMeters,
      grade, certification, process, variety, harvestMonth,
      readyLocation, tastingNotes, bagsAvailable, bagSizeKg,
      cupScore, pricePerKg, currency, visibility
    } = req.body;

    if (!lotName || !cropYear || !country) {
      return res.status(400).json({ message: 'lotName, cropYear, country are required' });
    }

    const insert = await query(
      `INSERT INTO coffee_lots
        (farmer_id, lot_name, crop_year, country, region, altitude_meters,
         grade, certification, process, variety, harvest_month, ready_location,
         tasting_notes, bags_available, bag_size_kg, cup_score, price_per_kg, currency,
         status, visibility)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'draft',$19)
       RETURNING *`,
      [
        farmerId,
        lotName,
        Number(cropYear),
        country,
        region || null,
        altitudeMeters ? Number(altitudeMeters) : null,
        grade || null,
        certification || null,
        process || null,
        variety || null,
        harvestMonth || null,
        readyLocation || null,
        tastingNotes || null,
        bagsAvailable ? Number(bagsAvailable) : 0,
        bagSizeKg ? Number(bagSizeKg) : 60,
        cupScore ? Number(cupScore) : null,
        pricePerKg ? Number(pricePerKg) : null,
        currency || 'USD',
        visibility || 'public'
      ]
    );

    return res.status(201).json({ lot: insert.rows[0] });
  } catch (err) {
    console.error('POST /api/farmer/lots error:', err);
    return res.status(500).json({ message: 'Failed to create lot' });
  }
});

/**
 * PUT /api/farmer/lots/:id
 */
router.put('/lots/:id', authenticateToken, requireFarmerOrAdmin, async (req, res) => {
  try {
    const lotId = req.params.id;
    const userId = req.user.userId;

    const existing = await query('SELECT farmer_id FROM coffee_lots WHERE id = $1', [lotId]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Lot not found' });

    const ownerId = existing.rows[0].farmer_id;
    if (req.user.role !== 'admin' && ownerId !== userId) return res.status(403).json({ message: 'Not your lot' });

    const fields = {
      lot_name: req.body.lotName,
      crop_year: req.body.cropYear,
      country: req.body.country,
      region: req.body.region,
      altitude_meters: req.body.altitudeMeters,
      grade: req.body.grade,
      certification: req.body.certification,
      process: req.body.process,
      variety: req.body.variety,
      harvest_month: req.body.harvestMonth,
      ready_location: req.body.readyLocation,
      tasting_notes: req.body.tastingNotes,
      bags_available: req.body.bagsAvailable,
      bag_size_kg: req.body.bagSizeKg,
      cup_score: req.body.cupScore,
      price_per_kg: req.body.pricePerKg,
      currency: req.body.currency,
      visibility: req.body.visibility,
      status: req.body.status
    };

    const setParts = [];
    const params = [];
    let i = 1;

    for (const [col, val] of Object.entries(fields)) {
      if (val === undefined) continue;
      setParts.push(`${col} = $${i++}`);
      params.push(val);
    }

    if (setParts.length === 0) return res.json({ message: 'No changes' });

    params.push(lotId);
    const sql = `UPDATE coffee_lots SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`;
    const updated = await query(sql, params);

    return res.json({ lot: updated.rows[0] });
  } catch (err) {
    console.error('PUT /api/farmer/lots/:id error:', err);
    return res.status(500).json({ message: 'Failed to update lot' });
  }
});

/**
 * DELETE /api/farmer/lots/:id
 */
router.delete('/lots/:id', authenticateToken, requireFarmerOrAdmin, async (req, res) => {
  try {
    const lotId = req.params.id;
    const userId = req.user.userId;

    const existing = await query('SELECT farmer_id FROM coffee_lots WHERE id = $1', [lotId]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Lot not found' });

    const ownerId = existing.rows[0].farmer_id;
    if (req.user.role !== 'admin' && ownerId !== userId) return res.status(403).json({ message: 'Not your lot' });

    await query('DELETE FROM coffee_lots WHERE id = $1', [lotId]);
    return res.json({ message: 'Lot deleted' });
  } catch (err) {
    console.error('DELETE /api/farmer/lots/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete lot' });
  }
});

/**
 * POST /api/farmer/lots/:id/publish
 * POST /api/farmer/lots/:id/unpublish
 */
async function setStatus(req, res, status) {
  try {
    const lotId = req.params.id;
    const userId = req.user.userId;

    const existing = await query('SELECT farmer_id FROM coffee_lots WHERE id = $1', [lotId]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Lot not found' });

    const ownerId = existing.rows[0].farmer_id;
    if (req.user.role !== 'admin' && ownerId !== userId) return res.status(403).json({ message: 'Not your lot' });

    const updated = await query(
      'UPDATE coffee_lots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, lotId]
    );

    return res.json({ lot: updated.rows[0] });
  } catch (err) {
    console.error('Set status error:', err);
    return res.status(500).json({ message: 'Failed to update status' });
  }
}

router.post('/lots/:id/publish', authenticateToken, requireFarmerOrAdmin, (req, res) => setStatus(req, res, 'published'));
router.post('/lots/:id/unpublish', authenticateToken, requireFarmerOrAdmin, (req, res) => setStatus(req, res, 'draft'));

export default router;
