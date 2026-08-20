const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query("SELECT id, full_name, username, password_hash, is_active FROM users", (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log(res.rows);
  }
  pool.end();
});
