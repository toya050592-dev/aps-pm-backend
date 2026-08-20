const bcrypt = require('bcryptjs');
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
    const hash = await bcrypt.hash('Fano1234', 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE username = 'fano'", [hash]);
    console.log('Password updated to Fano1234');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
})();
