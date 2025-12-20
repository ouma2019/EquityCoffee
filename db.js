// db.js – PostgreSQL connection + helper

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configure SSL for external PostgreSQL (like Render.com)
const isProduction = process.env.NODE_ENV === 'production';

// Create a connection pool using DATABASE_URL or individual env vars
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined
});

// Simple query helper used by all routes
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV !== 'test') {
    console.log('DB query', {
      text,
      duration,
      rows: res.rowCount
    });
  }

  return res;
}

// Test initial connection (optional, but helpful)
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    client.release();
  } catch (err) {
    console.error('⚠️  Could not connect to PostgreSQL:', err.message);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    console.log('Shutting down database connections…');
    await pool.end();
  } catch (err) {
    console.error('Error while shutting down pool:', err);
  } finally {
    process.exit(0);
  }
});

// ✅ Single, non-duplicate export
export { pool, query };
