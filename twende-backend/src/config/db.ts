// src/config/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // Neon serverless suspends after 5 min — these prevent surprise drops
  max: 10,                  // max connections in pool
  idleTimeoutMillis: 30000, // close idle connections after 30s (before Neon kills them)
  connectionTimeoutMillis: 10000, // fail fast if can't connect in 10s
});

// Catch pool-level errors so they don't crash the server
pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
  // Don't exit — pool will recover on next query
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;