const mysql = require('mysql2/promise');
async function run() {
    const pool = mysql.createPool({host:'localhost',user:'root',database:'db_pm_mysql'});
    const [rows] = await pool.query('SHOW CREATE TABLE projects');
    console.log(rows[0]['Create Table']);
    process.exit(0);
}
run();
