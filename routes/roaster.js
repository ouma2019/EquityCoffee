import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

/**
 * GET /api/roaster/
 */
router.get('/', (req, res) => {
  return res.json({ message: 'Roaster API root' });
});

/**
 * GET /api/roaster/contracts
 * Optional:
 *   - roasterId=<uuid>
 *   - status=<status>
 */
router.get('/contracts', authenticateToken, async (req, res) => {
  try {
    const roasterId = req.user?.userId;
    const { status } = req.query;
    
    const conditions = ['buyer_id = $1'];
    const values = [roasterId];

    if (status) {
      conditions.push('status = $' + (values.length + 1));
      values.push(status);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `
      SELECT
        id,
        contract_number,
        lot_id,
        farmer_id,
        buyer_id,
        quantity_bags,
        bag_size_kg,
        price_per_kg,
        currency,
        total_value,
        status,
        contract_date,
        notes,
        created_at,
        updated_at
      FROM contracts
      ${whereClause}
      ORDER BY contract_date DESC
    `;

    const result = await query(sql, values);
    return res.json({ contracts: result.rows });
  } catch (err) {
    console.error('List contracts error:', err);
    return res.status(500).json({ message: 'Failed to load contracts' });
  }
});

/**
 * GET /api/roaster/inventory
 * Requires authentication (roaster)
 */
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const roasterId = req.user?.userId;
    if (!roasterId) {
      return res.status(400).json({ message: 'Missing roaster context' });
    }

    const sql = `
      SELECT
        id,
        roaster_id,
        contract_id,
        lot_id,
        current_bags,
        bag_size_kg,
        location,
        notes,
        created_at,
        updated_at
      FROM roaster_inventory
      WHERE roaster_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [roasterId]);
    return res.json({ inventory: result.rows });
  } catch (err) {
    console.error('Roaster inventory error:', err);
    return res.status(500).json({ message: 'Failed to load inventory' });
  }
});

/**
 * POST /api/roaster/inventory
 * Add new inventory item
 */
router.post('/inventory', authenticateToken, async (req, res) => {
  try {
    const roasterId = req.user?.userId;
    const { contract_id, lot_id, current_bags, bag_size_kg, location, notes } = req.body;

    if (!roasterId) {
      return res.status(400).json({ message: 'Missing roaster context' });
    }

    if (!contract_id || !lot_id || current_bags === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const sql = `
      INSERT INTO roaster_inventory 
        (roaster_id, contract_id, lot_id, current_bags, bag_size_kg, location, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      roasterId,
      contract_id,
      lot_id,
      current_bags,
      bag_size_kg || 60, // Default 60kg per bag
      location,
      notes || ''
    ];

    const result = await query(sql, values);
    return res.status(201).json({ 
      message: 'Inventory item added successfully',
      inventory: result.rows[0]
    });
  } catch (err) {
    console.error('Add inventory error:', err);
    return res.status(500).json({ message: 'Failed to add inventory item' });
  }
});

/**
 * PUT /api/roaster/inventory/:id
 * Update inventory item
 */
router.put('/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const roasterId = req.user?.userId;
    const inventoryId = req.params.id;
    const { current_bags, location, notes } = req.body;

    if (!roasterId) {
      return res.status(400).json({ message: 'Missing roaster context' });
    }

    const sql = `
      UPDATE roaster_inventory 
      SET current_bags = $1, 
          location = $2, 
          notes = $3,
          updated_at = NOW()
      WHERE id = $4 AND roaster_id = $5
      RETURNING *
    `;

    const values = [
      current_bags,
      location,
      notes || '',
      inventoryId,
      roasterId
    ];

    const result = await query(sql, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    return res.json({ 
      message: 'Inventory item updated successfully',
      inventory: result.rows[0]
    });
  } catch (err) {
    console.error('Update inventory error:', err);
    return res.status(500).json({ message: 'Failed to update inventory item' });
  }
});

/**
 * DELETE /api/roaster/inventory/:id
 * Remove inventory item
 */
router.delete('/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const roasterId = req.user?.userId;
    const inventoryId = req.params.id;

    if (!roasterId) {
      return res.status(400).json({ message: 'Missing roaster context' });
    }

    const sql = `
      DELETE FROM roaster_inventory 
      WHERE id = $1 AND roaster_id = $2
      RETURNING id
    `;

    const result = await query(sql, [inventoryId, roasterId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    return res.json({ 
      message: 'Inventory item deleted successfully',
      deletedId: result.rows[0].id
    });
  } catch (err) {
    console.error('Delete inventory error:', err);
    return res.status(500).json({ message: 'Failed to delete inventory item' });
  }
});

/**
 * POST /api/roaster/contracts
 * Create a new contract
 */
router.post('/contracts', authenticateToken, async (req, res) => {
  try {
    const roasterId = req.user?.userId;
    const {
      contract_number,
      lot_id,
      farmer_id,
      quantity_bags,
      bag_size_kg,
      price_per_kg,
      currency,
      notes
    } = req.body;

    if (!roasterId) {
      return res.status(400).json({ message: 'Missing roaster context' });
    }

    if (!contract_number || !lot_id || !farmer_id || !quantity_bags || !price_per_kg) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const total_value = quantity_bags * (bag_size_kg || 60) * price_per_kg;

    const sql = `
      INSERT INTO contracts 
        (contract_number, lot_id, farmer_id, buyer_id, quantity_bags, 
         bag_size_kg, price_per_kg, currency, total_value, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      contract_number,
      lot_id,
      farmer_id,
      roasterId,
      quantity_bags,
      bag_size_kg || 60,
      price_per_kg,
      currency || 'USD',
      total_value,
      'pending', // Default status
      notes || ''
    ];

    const result = await query(sql, values);
    return res.status(201).json({ 
      message: 'Contract created successfully',
      contract: result.rows[0]
    });
  } catch (err) {
    console.error('Create contract error:', err);
    return res.status(500).json({ message: 'Failed to create contract' });
  }
});

/**
 * PUT /api/roaster/contracts/:id
 * Update contract status or details
 */
router.put('/contracts/:id', authenticateToken, async (req, res) => {
  try {
    const roasterId = req.user?.userId;
    const contractId = req.params.id;
    const { status, notes, quantity_bags, price_per_kg } = req.body;

    if (!roasterId) {
      return res.status(400).json({ message: 'Missing roaster context' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }
    if (quantity_bags !== undefined) {
      updates.push(`quantity_bags = $${paramCount}`);
      values.push(quantity_bags);
      paramCount++;
    }
    if (price_per_kg !== undefined) {
      updates.push(`price_per_kg = $${paramCount}`);
      values.push(price_per_kg);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    
    // Add contract ID and roaster ID for WHERE clause
    values.push(contractId, roasterId);

    const sql = `
      UPDATE contracts 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND buyer_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await query(sql, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    return res.json({ 
      message: 'Contract updated successfully',
      contract: result.rows[0]
    });
  } catch (err) {
    console.error('Update contract error:', err);
    return res.status(500).json({ message: 'Failed to update contract' });
  }
});

export default router;