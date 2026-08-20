const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'db_pm',
  password: 'admin',
  port: 5432,
});

async function runTest() {
  console.log('--- START WBS EXPORT TEST ---');
  let projectId;
  
  try {
    // 1. Find a project to test with
    const res = await pool.query('SELECT id, project_name FROM projects LIMIT 1');
    if (res.rows.length === 0) {
      console.log('No projects found in DB. Test Skipped.');
      return;
    }
    projectId = res.rows[0].id;
    const projectName = res.rows[0].project_name;
    console.log(`Found project: ${projectName} (ID: ${projectId})`);

    // 2. Make HTTP request to Export WBS endpoint
    const url = `http://127.0.0.1:3000/api/projects/${projectId}/export-wbs`;
    console.log(`Sending GET request to ${url}...`);

    const tempFile = path.join(__dirname, `wbs_export_test.xlsx`);

    const file = fs.createWriteStream(tempFile);
    http.get(url, (response) => {
      console.log(`Status Code: ${response.statusCode}`);
      console.log(`Content-Type: ${response.headers['content-type']}`);
      
      if (response.statusCode !== 200) {
        console.error('Test Failed: Expected 200 OK');
        response.resume();
        pool.end();
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log(`File saved to ${tempFile}`);
          const stats = fs.statSync(tempFile);
          console.log(`File size: ${stats.size} bytes`);
          if (stats.size > 0 && response.headers['content-type'].includes('spreadsheetml.sheet')) {
             console.log('✅ Test Passed: Valid Excel file exported successfully.');
          } else {
             console.log('❌ Test Failed: File is empty or wrong content type.');
          }
          pool.end();
          console.log('--- END WBS EXPORT TEST ---');
        });
      });
    }).on('error', (err) => {
      console.error('Request error:', err);
      pool.end();
    });

  } catch (err) {
    console.error('Error in test:', err);
    pool.end();
  }
}

runTest();
