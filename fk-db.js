require('dotenv').config();
const mysql = require('mysql2/promise');

async function applyFK() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    console.log("Menghubungkan ke database...");

    // 1. Clean orphans in projects
    console.log("Cleaning orphan pic_user_id in projects...");
    await pool.query(`UPDATE projects SET pic_user_id = NULL WHERE pic_user_id IS NOT NULL AND pic_user_id NOT IN (SELECT id FROM users)`);

    // 2. Clean orphans in overtime_requests
    console.log("Cleaning orphan user_id in overtime_requests...");
    await pool.query(`DELETE FROM overtime_requests WHERE user_id NOT IN (SELECT id FROM users)`);

    // 3. Clean orphans in task_history
    console.log("Cleaning orphan task_id in task_history...");
    await pool.query(`DELETE FROM task_history WHERE task_id NOT IN (SELECT id FROM tasks)`);

    // Add Foreign Key for projects
    console.log("Adding FK to projects...");
    // Drop it if exists first just in case
    try { await pool.query(`ALTER TABLE projects DROP FOREIGN KEY fk_projects_pic_user`); } catch(e){}
    await pool.query(`
      ALTER TABLE projects 
      ADD CONSTRAINT fk_projects_pic_user 
      FOREIGN KEY (pic_user_id) REFERENCES users(id) 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    // Add Foreign Key for overtime_requests
    console.log("Adding FK to overtime_requests...");
    try { await pool.query(`ALTER TABLE overtime_requests DROP FOREIGN KEY fk_overtime_user`); } catch(e){}
    await pool.query(`
      ALTER TABLE overtime_requests 
      ADD CONSTRAINT fk_overtime_user 
      FOREIGN KEY (user_id) REFERENCES users(id) 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Add Foreign Key for task_history
    console.log("Adding FK to task_history...");
    try { await pool.query(`ALTER TABLE task_history DROP FOREIGN KEY fk_history_task`); } catch(e){}
    await pool.query(`
      ALTER TABLE task_history 
      ADD CONSTRAINT fk_history_task 
      FOREIGN KEY (task_id) REFERENCES tasks(id) 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    console.log("Foreign Key Constraints applied successfully!");

  } catch (err) {
    console.error("Error during applying FK:", err);
  } finally {
    pool.end();
  }
}

applyFK();
