const {Pool} = require('pg');
const p = new Pool({user:'postgres',host:'localhost',database:'db_pm',password:'admin',port:5432});
p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks'").then(r => {
    console.log(r.rows);
    p.end();
});
