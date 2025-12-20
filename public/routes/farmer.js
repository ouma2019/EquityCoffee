import express from 'express';
import { authenticateToken } from './auth.js';
import { pool } from '../db.js';

const router = express.Router();

// Apply authentication to all farmer routes
router.use(authenticateToken);

// Get farmer dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get farmer stats
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('published', 'booked')) as active_lots,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_lots,
        COALESCE(SUM(quantity_bags), 0) as total_bags,
        COUNT(*) FILTER (WHERE status = 'published') as published_lots
      FROM coffee_lots 
      WHERE farmer_id = $1
    `;
    
    const statsResult = await pool.query(statsQuery, [userId]);
    const stats = statsResult.rows[0];
    
    // Get recent offers
    const offersQuery = `
      SELECT o.id, o.buyer_id, u.company_name, o.lot_id, l.name as lot_name,
             o.price_per_kg, o.quantity_bags, o.status, o.created_at
      FROM offers o
      JOIN users u ON o.buyer_id = u.id
      JOIN coffee_lots l ON o.lot_id = l.id
      WHERE l.farmer_id = $1
      ORDER BY o.created_at DESC
      LIMIT 5
    `;
    
    const offersResult = await pool.query(offersQuery, [userId]);
    
    // Get recent contracts
    const contractsQuery = `
      SELECT c.id, c.contract_number, u.company_name as buyer_name,
             l.name as lot_name, c.quantity_bags, c.total_value, c.status
      FROM contracts c
      JOIN users u ON c.buyer_id = u.id
      JOIN coffee_lots l ON c.lot_id = l.id
      WHERE c.farmer_id = $1
      ORDER BY c.created_at DESC
      LIMIT 5
    `;
    
    const contractsResult = await pool.query(contractsQuery, [userId]);
    
    res.json({
      stats: {
        activeLots: parseInt(stats.active_lots),
        draftLots: parseInt(stats.draft_lots),
        totalBags: parseInt(stats.total_bags),
        publishedLots: parseInt(stats.published_lots)
      },
      recentOffers: offersResult.rows,
      recentContracts: contractsResult.rows
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// Get farmer's coffee lots
router.get('/lots', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;
    
    let query = `
      SELECT id, name, country, region, variety, process, harvest_year,
             cup_score, quantity_bags, price_per_kg, status, visibility,
             created_at, updated_at
      FROM coffee_lots 
      WHERE farmer_id = $1
    `;
    
    const params = [userId];
    
    if (status && status !== 'all') {
      query += ' AND status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({ lots: result.rows });
    
  } catch (error) {
    console.error('Get lots error:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

// Create new coffee lot
router.post('/lots', async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name, country, region, variety, process, harvestYear,
      cupScore, quantityBags, pricePerKg, status, visibility
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO coffee_lots (
        farmer_id, name, country, region, variety, process, harvest_year,
        cup_score, quantity_bags, price_per_kg, status, visibility
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId, name, country, region, variety, process, harvestYear,
        cupScore, quantityBags, pricePerKg, status, visibility
      ]
    );
    
    res.status(201).json({ lot: result.rows[0] });
    
  } catch (error) {
    console.error('Create lot error:', error);
    res.status(500).json({ error: 'Failed to create lot' });
  }
});

// Update coffee lot
router.put('/lots/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const lotId = req.params.id;
    const updates = req.body;
    
    // Verify ownership
    const ownershipCheck = await pool.query(
      'SELECT id FROM coffee_lots WHERE id = $1 AND farmer_id = $2',
      [lotId, userId]
    );
    
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    
    // Build dynamic update query
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates);
    values.unshift(lotId);
    
    const query = `
      UPDATE coffee_lots 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    res.json({ lot: result.rows[0] });
    
  } catch (error) {
    console.error('Update lot error:', error);
    res.status(500).json({ error: 'Failed to update lot' });
  }
});

export default router;