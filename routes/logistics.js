import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

/**
 * GET /api/logistics/
 */
router.get('/', (req, res) => {
  return res.json({ message: 'Logistics API root' });
});

/**
 * GET /api/logistics/shipments
 * Optional query:
 *  - contractId=<uuid>
 *  - status=<status>
 */
router.get('/shipments', async (req, res) => {
  try {
    const { contractId, status } = req.query;
    const conditions = [];
    const values = [];

    if (contractId) {
      conditions.push('contract_id = $' + (values.length + 1));
      values.push(contractId);
    }
    if (status) {
      conditions.push('status = $' + (values.length + 1));
      values.push(status);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const sql = `
      SELECT
        id,
        contract_id,
        reference,
        origin_port,
        destination_port,
        container_number,
        vessel_name,
        carrier,
        etd,
        eta,
        status,
        tracking_url,
        notes,
        created_at,
        updated_at
      FROM shipments
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await query(sql, values);
    return res.json({ shipments: result.rows });
  } catch (err) {
    console.error('List shipments error:', err);
    return res.status(500).json({ message: 'Failed to load shipments' });
  }
});

/**
 * POST /api/logistics/shipments
 * Create a new shipment
 */
router.post('/shipments', authenticateToken, async (req, res) => {
  try {
    const {
      contractId,
      reference,
      originPort,
      destinationPort,
      containerNumber,
      vesselName,
      carrier,
      etd,
      eta,
      status,
      trackingUrl,
      notes
    } = req.body;

    if (!contractId || !reference) {
      return res.status(400).json({ message: 'contractId and reference are required' });
    }

    const sql = `
      INSERT INTO shipments (
        contract_id,
        reference,
        origin_port,
        destination_port,
        container_number,
        vessel_name,
        carrier,
        etd,
        eta,
        status,
        tracking_url,
        notes
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING *
    `;

    const values = [
      contractId,
      reference,
      originPort || null,
      destinationPort || null,
      containerNumber || null,
      vesselName || null,
      carrier || null,
      etd || null,
      eta || null,
      status || 'booked',
      trackingUrl || null,
      notes || null
    ];

    const result = await query(sql, values);
    return res.status(201).json({ shipment: result.rows[0] });
  } catch (err) {
    console.error('Create shipment error:', err);
    return res.status(500).json({ message: 'Failed to create shipment' });
  }
});

export default router;
