const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('WARNING: DATABASE_URL environment variable is not defined.');
}

const pool = new Pool({
  connectionString: connectionString,
  // Enable SSL in production or if using a cloud database (like Render, Neon, Supabase)
  ssl: process.env.NODE_ENV === 'production' || (connectionString && connectionString.includes('neon.tech') || connectionString && connectionString.includes('supabase.co'))
    ? { rejectUnauthorized: false }
    : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
