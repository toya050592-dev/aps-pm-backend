require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixDB() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    console.log("Menghubungkan ke database...");
    
    // 1. Check and Clean projects.pic_user_id
    console.log("Checking projects.pic_user_id...");
    const [pRows] = await pool.query(`SELECT id, pic_user_id FROM projects WHERE pic_user_id IS NOT NULL AND pic_user_id NOT REGEXP '^[0-9]+$'`);
    if (pRows.length > 0) {
      console.log(`Found ${pRows.length} non-numeric pic_user_id in projects. Cleaning to NULL...`);
      await pool.query(`UPDATE projects SET pic_user_id = NULL WHERE pic_user_id IS NOT NULL AND pic_user_id NOT REGEXP '^[0-9]+$'`);
    }

    // 2. Check and Clean overtime_requests.user_id
    console.log("Checking overtime_requests.user_id...");
    const [oRows] = await pool.query(`SELECT id, user_id FROM overtime_requests WHERE user_id IS NOT NULL AND user_id NOT REGEXP '^[0-9]+$'`);
    if (oRows.length > 0) {
      console.log(`Found ${oRows.length} non-numeric user_id in overtime_requests. Cleaning to NULL...`);
      // Since user_id was NOT NULL, let's modify it to allow NULL first, or delete if it's orphan. 
      // Overtime without a user is useless. Let's delete them.
      console.log(`Deleting orphan overtime_requests with non-numeric user_id...`);
      await pool.query(`DELETE FROM overtime_requests WHERE user_id IS NOT NULL AND user_id NOT REGEXP '^[0-9]+$'`);
    }
    
    // 3. Check and Clean task_history.task_id
    console.log("Checking task_history.task_id...");
    const [tRows] = await pool.query(`SELECT id, task_id FROM task_history WHERE task_id IS NOT NULL AND task_id NOT REGEXP '^[0-9]+$'`);
    if (tRows.length > 0) {
      console.log(`Found ${tRows.length} non-numeric task_id in task_history. Deleting orphan history...`);
      await pool.query(`DELETE FROM task_history WHERE task_id IS NOT NULL AND task_id NOT REGEXP '^[0-9]+$'`);
    }

    // Now ALTER TABLE
    console.log("Altering projects.pic_user_id to INT...");
    await pool.query(`ALTER TABLE projects MODIFY COLUMN pic_user_id INT`);
    
    console.log("Altering overtime_requests.user_id to INT...");
    await pool.query(`ALTER TABLE overtime_requests MODIFY COLUMN user_id INT NOT NULL`);
    
    console.log("Altering task_history.task_id to INT...");
    await pool.query(`ALTER TABLE task_history MODIFY COLUMN task_id INT NOT NULL`);
    
    console.log("DB Fix Completed successfully!");

  } catch (err) {
    console.error("Error during DB Fix:", err);
  } finally {
    pool.end();
  }
}

fixDB();
