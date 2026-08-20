const mysql = require('mysql2/promise');
async function run() {
    const pool = mysql.createPool({host:'localhost',user:'root',database:'db_pm_mysql'});
    try {
        await pool.query('ALTER TABLE projects ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        console.log('Added created_at to projects');
    } catch(e) {
        if(e.code === 'ER_DUP_FIELDNAME') console.log('created_at already exists in projects');
        else console.error('projects error:', e.message);
    }
    try {
        await pool.query('ALTER TABLE tasks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        console.log('Added created_at to tasks');
    } catch(e) {
        if(e.code === 'ER_DUP_FIELDNAME') console.log('created_at already exists in tasks');
        else console.error('tasks error:', e.message);
    }
    process.exit(0);
}
run();
