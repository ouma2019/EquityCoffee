import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Add it to your .env / Render environment variables.');
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: 5,
  });

  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Running schema.sql...');
    await client.query(sql);
    console.log('✅ Database schema applied successfully.');
  } catch (err) {
    console.error('❌ Error running migrations:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
