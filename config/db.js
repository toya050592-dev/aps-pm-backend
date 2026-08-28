const mysql = require('mysql2/promise');

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud') ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00'
});

const pool = {
  query: async (text, params) => {
    let sql = text.replace(/\$(\d+)/g, '?');
    let isReturning = false;
    let returningMatch = sql.match(/RETURNING\s+(.*)/i);
    let tableName = null;

    if (returningMatch) {
       isReturning = true;
       sql = sql.replace(/RETURNING\s+(.*)/i, '').trim();
       
       let insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
       if (insertMatch) tableName = insertMatch[1];
       
       let updateMatch = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
       if (updateMatch) tableName = updateMatch[1];
    }
    
    const [rows] = await mysqlPool.query(sql, params);
    
    if (rows && !Array.isArray(rows)) {
        if (isReturning && tableName) {
             if (!/^[a-zA-Z0-9_]+$/.test(tableName)) throw new Error('Invalid table name in wrapper');
             if (rows.insertId) {
                  const [sel] = await mysqlPool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [rows.insertId]);
                  return { rows: sel, affectedRows: rows.affectedRows || 0 };
             } else if (sql.toUpperCase().includes('UPDATE')) {
                  let idParamIndex = text.match(/WHERE\s+id\s*=\s*\$(\d+)/i);
                  if (idParamIndex && params) {
                      let idVal = params[parseInt(idParamIndex[1]) - 1];
                      const [sel] = await mysqlPool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [idVal]);
                      return { rows: sel, affectedRows: rows.affectedRows || 0 };
                  }
             }
        }
        return { rows: rows.affectedRows > 0 ? [{ id: 'modified' }] : [], affectedRows: rows.affectedRows || 0 };
    }
    
    return { rows: rows || [] };
  },
  connect: async () => {
     const conn = await mysqlPool.getConnection();
     return {
        query: async (text, params) => {
           let sql = text.replace(/\$(\d+)/g, '?');
           let tableName = '';
           let insertMatch = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
           if (insertMatch) tableName = insertMatch[1];

           sql = sql.replace(/RETURNING\s+(.*)/i, '');
           const [rows] = await conn.query(sql, params);

           if (!Array.isArray(rows)) {
               if (sql.toUpperCase().includes('INSERT') && rows.insertId && tableName) {
                   if (!/^[a-zA-Z0-9_]+$/.test(tableName)) throw new Error('Invalid table name in wrapper');
                   const [sel] = await conn.query(`SELECT * FROM ${tableName} WHERE id = ?`, [rows.insertId]);
                   return { rows: sel, affectedRows: rows.affectedRows || 0 };
               }
               return { rows: rows.affectedRows > 0 ? [{ id: 'modified' }] : [], affectedRows: rows.affectedRows || 0 };
           }
           return { rows: Array.isArray(rows) ? rows : [] };
        },
        release: () => conn.release()
     };
  },
  end: () => mysqlPool.end()
};

// Self-invoking test connection (ping) on startup
(async () => {
    try {
        await pool.query('SELECT 1');
        console.log('[DB] Database Connection Established Successfully.');
    } catch (err) {
        console.error('[DB] Failed to connect to database on startup:', err.message);
    }
})();

module.exports = { pool, mysqlPool };
