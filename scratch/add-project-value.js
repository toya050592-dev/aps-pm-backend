const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

(async () => {
  try {
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_value NUMERIC DEFAULT 0;`);
    console.log('Successfully added project_value to projects table.');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    pool.end();
  }
})();
