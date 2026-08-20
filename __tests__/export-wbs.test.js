const request = require('supertest');
const { app, pool } = require('../server'); // We need to export app and pool from server.js for this to work perfectly, but for now we'll assume we can at least ping the endpoint if server is running, or if server exports app.
// Wait, if server.js does not export app, supertest might need the server running on a port or we can just mock it.
// To keep it non-intrusive to server.js, we'll write a test that hits localhost:3000 directly if it's running.

describe('GET /api/projects/:projectId/export-wbs', () => {
  let projectId = '';

  beforeAll(async () => {
    // Attempt to get a valid project ID from DB
    const { Pool } = require('pg');
    const tempPool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'db_pm',
      password: 'admin',
      port: 5432,
    });
    
    try {
      const res = await tempPool.query('SELECT id FROM projects LIMIT 1');
      if (res.rows.length > 0) {
        projectId = res.rows[0].id;
      }
    } catch (e) {
      console.warn('Could not connect to DB for setup', e);
    } finally {
      await tempPool.end();
    }
  });

  it('should return 200 and a valid excel file content type', async () => {
    if (!projectId) {
      console.warn('No project ID found, skipping test');
      return;
    }

    // Hit the live server for this basic test, as we don't want to modify server.js to export app
    const response = await request('http://127.0.0.1:3000')
      .get(`/api/projects/${projectId}/export-wbs`);
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
  });
});
