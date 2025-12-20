import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

/**
 * GET /api/educator/
 * Simple health/info endpoint
 */
router.get('/', authenticateToken, (req, res) => {
  return res.json({ message: 'Educator API root – prototype only' });
});

/**
 * GET /api/educator/sample-metrics
 * Example endpoint returning static metrics for now.
 */
router.get('/sample-metrics', authenticateToken, async (req, res) => {
  try {
    // In a full build, this would aggregate cupping + training data
    return res.json({
      cuppingsThisMonth: 8,
      lotsEvaluated: 24,
      trainingsPlanned: 5
    });
  } catch (err) {
    console.error('Educator metrics error:', err);
    return res.status(500).json({ message: 'Failed to load educator metrics' });
  }
});

export default router;
