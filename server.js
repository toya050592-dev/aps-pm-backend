require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const multer = require('multer');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sanitizeHtml = require('sanitize-html');

// Configure multer for memory storage
const safeFileFilter = (req, file, cb) => { if(file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel')) { cb(null, true); } else { cb(new Error('Format dilarang! Hanya Gambar, PDF, Excel.')); } };
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15*1024*1024 } });

const app = express();
const port = process.env.PORT || 3000;

const http = require('http');
const httpServer = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust in production
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const fs = require('fs');
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
if (!fs.existsSync('./uploads/bast')) {
    fs.mkdirSync('./uploads/bast');
}
const uploadDisk = multer({ dest: 'uploads/', fileFilter: safeFileFilter, limits: { fileSize: 15*1024*1024 } });

const bastStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/bast/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'bast-' + uniqueSuffix + '.pdf')
    }
})
const uploadBast = multer({ storage: bastStorage, fileFilter: safeFileFilter, limits: { fileSize: 15*1024*1024 } });

app.use('/uploads', express.static('uploads'));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));

// --- XSS SANITIZER MIDDLEWARE ---
// Rekursif membersihkan semua input string di req.body dari injeksi HTML/Javascript
const xssSanitizer = (req, res, next) => {
  if (req.body) {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeHtml(obj[key], {
            allowedTags: [], // Hapus semua tag HTML (<script>, <b>, dll)
            allowedAttributes: {}
          });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    sanitizeObject(req.body);
  }
  next();
};
app.use(xssSanitizer);

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: 'Too many requests' });
app.use('/api', apiLimiter);
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many login attempts' });

const authenticateToken = (req, res, next) => {
  // Allow public routes
  if (req.path === '/login' || req.path === '/login/') return next();

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Akses ditolak: Token tidak ditemukan' });

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Sesi kedaluwarsa atau token tidak valid' });

    try {
      // Use the pool to verify session_token matches the database to handle force-logout
      const result = await pool.query("SELECT session_token, is_active FROM users WHERE id = $1", [decoded.id]);
      if (result.rows.length === 0) return res.status(401).json({ message: 'User tidak ditemukan' });
      
      if (!result.rows[0].is_active) {
        return res.status(403).json({ message: 'Akun Anda telah dinonaktifkan oleh Admin.' });
      }

      if (result.rows[0].session_token !== decoded.session_token) {
        return res.status(401).json({ message: 'Sesi tidak valid (akun login di perangkat lain)' });
      }
      
      req.user = decoded; // Pass decoded user to the next middleware/route
      next();
    } catch (e) {
      console.error('Auth DB Error:', e);
      res.status(500).json({ message: 'Kesalahan internal server saat verifikasi' });
    }
  });
};

// Protect all /api routes globally
app.use('/api', authenticateToken);

const authorizeAdmin = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'Akses ditolak. Peran tidak dikenali.' });
  }
  if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ message: 'Akses ditolak. Hanya Admin yang diizinkan untuk tindakan ini.' });
  }
  next();
};


app.use((req, res, next) => {
  req.io = io;
  next();
});

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud') ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
             if (rows.insertId) {
                  const [sel] = await mysqlPool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [rows.insertId]);
                  return { rows: sel };
             } else if (sql.toUpperCase().includes('UPDATE')) {
                  let idParamIndex = text.match(/WHERE\s+id\s*=\s*\$(\d+)/i);
                  if (idParamIndex && params) {
                      let idVal = params[parseInt(idParamIndex[1]) - 1];
                      const [sel] = await mysqlPool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [idVal]);
                      return { rows: sel };
                  }
             }
        }
        // For delete RETURNING
        return { rows: rows.affectedRows > 0 ? [{ id: 'modified' }] : [] };
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
               if (sql.toUpperCase().includes('INSERT') && rows.insertId) {
                   const [sel] = await conn.query(`SELECT * FROM ${tableName} WHERE id = ?`, [rows.insertId]);
                   return { rows: sel };
               }
               return { rows: [] };
           }
           return { rows: Array.isArray(rows) ? rows : [] };
        },
        release: () => conn.release()
     };
  },
  end: () => mysqlPool.end()
};


(async function initDB() {
  try {
    const client = await pool.connect();
    console.log('Berhasil terhubung ke database MySQL! Melakukan pengecekan tabel...');
    
    // MySQL requires executing statements one by one if multipleStatements is not enabled
    const queries = [
      "ALTER TABLE users ADD COLUMN session_token VARCHAR(255)",
      "ALTER TABLE projects ADD COLUMN pic_user_id INT",
      "ALTER TABLE projects ADD COLUMN product_type_id INT",
      "ALTER TABLE projects ADD COLUMN pic_marketing_id INT",
      "ALTER TABLE projects ADD COLUMN actual_end_date DATE",
      "ALTER TABLE projects ADD COLUMN created_at DATE DEFAULT (CURRENT_DATE)",
      `CREATE TABLE IF NOT EXISTS task_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        action TEXT NOT NULL,
        created_at DATE DEFAULT (CURRENT_DATE)
      )`,
      `CREATE TABLE IF NOT EXISTS master_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATE DEFAULT (CURRENT_DATE)
      )`,
      `CREATE TABLE IF NOT EXISTS overtime_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        department VARCHAR(100),
        overtime_date DATE,
        is_holiday BOOLEAN DEFAULT false,
        start_time TIME,
        end_time TIME,
        hours NUMERIC(5,2),
        reason TEXT,
        evidence_url TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS document_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT,
        no_pengajuan VARCHAR(100),
        kebutuhan TEXT,
        keterangan TEXT,
        nilai_estimasi NUMERIC,
        file_pm TEXT,
        pm_date DATE,
        pm_pic VARCHAR(100),
        no_pr VARCHAR(100),
        file_pr TEXT,
        pr_submitted_date DATE,
        pr_approved_date DATE,
        pr_pic VARCHAR(100),
        no_po VARCHAR(100),
        nilai_final NUMERIC,
        file_po TEXT,
        po_date DATE,
        po_pic VARCHAR(100),
        file_implementasi TEXT,
        implementasi_date DATE,
        file_bast TEXT,
        bast_date DATE,
        completed_date DATE,
        status VARCHAR(50) DEFAULT 'PENGAJUAN',
        last_updated_by VARCHAR(100),
        last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS document_handovers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        nama_dokumen VARCHAR(255) NOT NULL,
        catatan TEXT,
        status VARCHAR(20) DEFAULT 'DIBERIKAN',
        tanggal_diberikan TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tanggal_diterima TIMESTAMP NULL
      )`,
      "CREATE INDEX idx_master_type_active ON master_data(type, is_active)",
      "CREATE INDEX idx_doctrack_no ON document_tracking(no_pengajuan)",
      "CREATE INDEX idx_doctrack_status ON document_tracking(status)",
      "CREATE INDEX idx_handover_doc ON document_handovers(document_id)",
      "CREATE INDEX idx_handover_sender ON document_handovers(sender_id)",
      "CREATE INDEX idx_handover_receiver ON document_handovers(receiver_id)",
      "CREATE INDEX idx_handover_date ON document_handovers(tanggal_diberikan)",
      "CREATE INDEX idx_tasks_project ON tasks(project_id)",
      "CREATE INDEX idx_tasks_status ON tasks(status)",
      "ALTER TABLE projects ADD CONSTRAINT fk_projects_pic_user FOREIGN KEY (pic_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE",
      "ALTER TABLE overtime_requests ADD CONSTRAINT fk_overtime_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE",
      "ALTER TABLE task_history ADD CONSTRAINT fk_history_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE"
    ];

    for (let q of queries) {
      try {
        await client.query(q);
      } catch (err) {
        // Ignore duplicate column/key errors for ALTER TABLE and CREATE INDEX
        if (!err.message.includes("Duplicate column name") && !err.message.includes("Duplicate key name") && !err.message.includes("Duplicate foreign key")) {
          // console.error("Query init failed:", err.message);
        }
      }
    }
    client.release();
    console.log('Inisialisasi tabel/kolom selesai.');
  } catch (e) {
    console.error("Gagal koneksi atau inisialisasi database:", e);
  }
})();

// Kolom aman yang boleh dikirim ke frontend (TIDAK termasuk password_hash)
const SAFE_USER_FIELDS = "id, full_name, role, username, is_active, permissions, nik, jabatan";

// Validasi kekuatan password sesuai prinsip keamanan data (PDP)
function isPasswordStrong(password) {
  if (!password || password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

app.get('/', (req, res) => {
  res.json({
    status: "Sukses",
    message: "Mesin Backend Aplikasi Project Management Berjalan Normal!",
    modul_aktif: ["WBS", "Timeline", "Resource Management", "Auth & Permissions"]
  });
});

// --- USERS ---
app.post('/api/users', authorizeAdmin, async (req, res) => {
  try {
    const { full_name, role, username, password, permissions, nik, jabatan } = req.body;

    if (password && !isPasswordStrong(password)) {
      return res.status(400).json({ message: "Password minimal 8 karakter dan harus mengandung kombinasi huruf serta angka." });
    }

    const password_hash = password ? await bcrypt.hash(password, 10) : null;
    const perms = JSON.stringify(permissions && permissions.length ? permissions : ['summary', 'dashboard']);

    const newUser = await pool.query(
      `INSERT INTO users (full_name, role, username, password_hash, permissions, nik, jabatan)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${SAFE_USER_FIELDS}`,
      [full_name, role, username || null, password_hash, perms, nik || null, jabatan || null]
    );
    res.json(newUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan pada server. Pastikan username belum dipakai orang lain.");
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await pool.query(`SELECT ${SAFE_USER_FIELDS} FROM users ORDER BY full_name ASC`);
    res.json(allUsers.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan pada server");
  }
});

app.put('/api/users/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, permissions, username, nik, jabatan } = req.body;
    const perms = JSON.stringify(permissions || []);
    const updated = await pool.query(
      `UPDATE users SET full_name = $1, role = $2, permissions = $3, username = $4, nik = $5, jabatan = $6 WHERE id = $7 RETURNING ${SAFE_USER_FIELDS}`,
      [full_name, role, perms, username || null, nik || null, jabatan || null, id]
    );
    res.json({ message: "Data anggota tim berhasil diperbarui.", data: updated.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan. Pastikan ID Login (Username) belum dipakai orang lain.");
  }
});

app.put('/api/users/:id/status', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const updated = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING ${SAFE_USER_FIELDS}`,
      [is_active, id]
    );
    res.json({ message: "Status anggota tim berhasil diperbarui.", data: updated.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengubah status user");
  }
});

app.put('/api/users/:id/password', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!isPasswordStrong(password)) {
      return res.status(400).json({ message: "Password minimal 8 karakter dan harus mengandung kombinasi huruf serta angka." });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, id]);
    res.json({ message: "Password berhasil diperbarui." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengubah password");
  }
});
app.post('/api/projects/:id/bast', uploadBast.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }
    const filePath = `uploads/bast/${req.file.filename}`;
    const updateResult = await pool.query(
      "UPDATE projects SET bast_file = $1 WHERE id = $2 RETURNING *",
      [filePath, id]
    );
    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, project_value, progress, issues, target_golive, actual_end_date, pic_user_id, baseline_start_date, pic_marketing_id, last_updated_by, product_type_id } = req.body;
    const updateProject = await pool.query(
      "UPDATE projects SET status = COALESCE($1, status), project_value = COALESCE($2, project_value), progress = COALESCE($3, progress), issues = COALESCE($4, issues), baseline_end_date = COALESCE($5, baseline_end_date), actual_end_date = COALESCE($6, actual_end_date), pic_user_id = COALESCE($7, pic_user_id), baseline_start_date = COALESCE($8, baseline_start_date), pic_marketing_id = COALESCE($9, pic_marketing_id), last_updated_by = COALESCE($10, last_updated_by), product_type_id = COALESCE($11, product_type_id) WHERE id = $12 RETURNING *",
      [status, project_value, progress, issues, target_golive, actual_end_date, pic_user_id, baseline_start_date, pic_marketing_id, last_updated_by, product_type_id, id]
    );
    res.json(updateProject.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat update status");
  }
});

// --- MASTER DATA ---
app.get('/api/master-data', async (req, res) => {
  try {
    const { type } = req.query;
    let query = "SELECT * FROM master_data ORDER BY id ASC";
    let params = [];
    if (type) {
      query = "SELECT * FROM master_data WHERE type = $1 ORDER BY id ASC";
      params = [type];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengambil master data");
  }
});

app.post('/api/master-data', authorizeAdmin, async (req, res) => {
  try {
    const { type, name } = req.body;
    const result = await pool.query(
      "INSERT INTO master_data (type, name) VALUES ($1, $2) RETURNING *",
      [type, name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat menambah master data");
  }
});

app.put('/api/master-data/:id/status', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const result = await pool.query(
      "UPDATE master_data SET is_active = $1 WHERE id = $2 RETURNING *",
      [is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengupdate status master data");
  }
});

app.put('/api/master-data/:id', authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Check if it's a ROLE and fetch old name
    const oldDataRes = await pool.query("SELECT * FROM master_data WHERE id = $1", [id]);
    const oldData = oldDataRes.rows[0];
    
    const result = await pool.query(
      "UPDATE master_data SET name = $1 WHERE id = $2 RETURNING *",
      [name, id]
    );

    // If a ROLE name is updated, cascade the change to the users table
    if (oldData && oldData.type === 'ROLE' && oldData.name !== name) {
      await pool.query("UPDATE users SET role = $1 WHERE role = $2", [name, oldData.name]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengupdate master data");
  }
});

// --- LOGIN & AUTH ---
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ message: "Username tidak ditemukan." });
    if (!user.is_active) return res.status(401).json({ message: "Akun ini sudah dinonaktifkan." });
    if (!user.password_hash) return res.status(401).json({ message: "Akun ini belum memiliki password. Hubungi Admin." });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: "Password salah." });

    const sessionToken = crypto.randomUUID();
    await pool.query("UPDATE users SET session_token = $1 WHERE id = $2", [sessionToken, user.id]);

    const safeUser = {
      id: user.id, full_name: user.full_name, role: user.role,
      username: user.username, permissions: user.permissions,
      session_token: sessionToken
    };

    const token = jwt.sign(safeUser, process.env.JWT_SECRET, { expiresIn: '40m' });
    res.json({ message: "Login berhasil!", token, user: safeUser });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat login");
  }
});

// --- LOGOUT ---
app.post('/api/logout', async (req, res) => {
  try {
    // We don't need body, just the authenticated user's ID
    if (req.user && req.user.id) {
      // Rotate the session token to instantly revoke the current JWT
      const newSessionToken = crypto.randomUUID();
      await pool.query("UPDATE users SET session_token =  WHERE id = ", [newSessionToken, req.user.id]);
    }
    res.json({ message: 'Logout berhasil, sesi dihapus.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Kesalahan saat logout' });
  }
});

// --- LOGOUT ---
app.post('/api/logout', async (req, res) => {
  try {
    // We don't need body, just the authenticated user's ID from req.user
    if (req.user && req.user.id) {
      // Rotate the session token to instantly revoke the current JWT
      const newSessionToken = crypto.randomUUID();
      await pool.query("UPDATE users SET session_token = $1 WHERE id = $2", [newSessionToken, req.user.id]);
    }
    res.json({ message: 'Logout berhasil, sesi dihapus.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Kesalahan saat logout' });
  }
});

app.get('/api/auth/check', (req, res) => {
  // Jika berhasil lolos dari middleware authenticateToken, berarti token valid
  res.json({ valid: true, user: req.user });
});

// --- PROJECTS ---
app.post('/api/projects', async (req, res) => {
  try {
    const { project_name, status, baseline_start_date, baseline_end_date, pic_user_id, product_type_id, project_value, progress, issues, pic_marketing_id } = req.body;
    const newProject = await pool.query(
        "INSERT INTO projects (project_name, status, baseline_start_date, baseline_end_date, pic_user_id, product_type_id, project_value, progress, issues, pic_marketing_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
        [project_name, status, baseline_start_date, baseline_end_date, pic_user_id || null, product_type_id || null, project_value || 0, progress || '', issues || '', pic_marketing_id || null]
      );
      req.io.emit('new_project', newProject.rows[0]);
      res.json(newProject.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat membuat proyek");
  }
});

// ---------- DASHBOARD STATS ----------
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const { period, startDate, endDate, productTypeId } = req.query;
    let pFilter = "";
    let tFilter = "";

    if (productTypeId) {
      const pid = parseInt(productTypeId, 10);
      if (!isNaN(pid)) {
        pFilter += ` AND product_type_id = ${pid}`;
        tFilter += ` AND project_id IN (SELECT id FROM projects WHERE product_type_id = ${pid})`;
      }
    }

    if (period === 'custom') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (startDate && dateRegex.test(startDate)) {
        pFilter += ` AND DATE(COALESCE(actual_end_date, baseline_end_date, created_at)) >= '${startDate}'`;
        tFilter += ` AND DATE(COALESCE(plan_end_date, CURRENT_DATE)) >= '${startDate}'`;
      }
      if (endDate && dateRegex.test(endDate)) {
        pFilter += ` AND DATE(COALESCE(actual_end_date, baseline_end_date, created_at)) <= '${endDate}'`;
        tFilter += ` AND DATE(COALESCE(plan_end_date, CURRENT_DATE)) <= '${endDate}'`;
      }
    } else if (period === 'this_month') {
      pFilter += " AND EXTRACT(MONTH FROM COALESCE(actual_end_date, baseline_end_date, created_at)) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM COALESCE(actual_end_date, baseline_end_date, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)";
      tFilter += " AND EXTRACT(MONTH FROM COALESCE(plan_end_date, CURRENT_DATE)) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM COALESCE(plan_end_date, CURRENT_DATE)) = EXTRACT(YEAR FROM CURRENT_DATE)";
    } else if (period === 'last_month') {
      pFilter += " AND EXTRACT(MONTH FROM COALESCE(actual_end_date, baseline_end_date, created_at)) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL 1 MONTH) AND EXTRACT(YEAR FROM COALESCE(actual_end_date, baseline_end_date, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL 1 MONTH)";
      tFilter += " AND EXTRACT(MONTH FROM COALESCE(plan_end_date, CURRENT_DATE)) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL 1 MONTH) AND EXTRACT(YEAR FROM COALESCE(plan_end_date, CURRENT_DATE)) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL 1 MONTH)";
    } else if (period === 'this_year') {
      pFilter += " AND ((status IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND EXTRACT(YEAR FROM COALESCE(actual_end_date, baseline_end_date, baseline_start_date, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)) OR (status NOT IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project')))";
      tFilter += " AND project_id IN (SELECT id FROM projects WHERE ((status IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND EXTRACT(YEAR FROM COALESCE(actual_end_date, baseline_end_date, baseline_start_date, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)) OR (status NOT IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project'))))";
    } else if (period === 'by_year') {
      const yearVal = parseInt(req.query.year, 10);
      if (!isNaN(yearVal)) {
        pFilter += ` AND ((status IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND EXTRACT(YEAR FROM COALESCE(actual_end_date, baseline_end_date, baseline_start_date, created_at)) = ${yearVal}) OR (status NOT IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND EXTRACT(YEAR FROM CURRENT_DATE) = ${yearVal}))`;
        tFilter += ` AND project_id IN (SELECT id FROM projects WHERE ((status IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND EXTRACT(YEAR FROM COALESCE(actual_end_date, baseline_end_date, baseline_start_date, created_at)) = ${yearVal}) OR (status NOT IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND EXTRACT(YEAR FROM CURRENT_DATE) = ${yearVal})))`;
      }
    }

    // Basic Counts
    const projectCountRes = await pool.query(`SELECT COUNT(*) as count FROM projects WHERE 1=1 ${pFilter}`);
    const totalProjects = parseInt(projectCountRes.rows[0].count, 10);

    const taskCountRes = await pool.query(`SELECT COUNT(*) as count FROM tasks WHERE 1=1 ${tFilter}`);
    const totalTasks = parseInt(taskCountRes.rows[0].count, 10);

    const completedTaskRes = await pool.query(`SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed' ${tFilter}`);
    const completedTasks = parseInt(completedTaskRes.rows[0].count, 10);

    const delayedTaskRes = await pool.query(`SELECT COUNT(*) as count FROM tasks WHERE status != 'Completed' AND plan_end_date < CURRENT_DATE ${tFilter}`);
    const delayedTasks = parseInt(delayedTaskRes.rows[0].count, 10);

    const openIssueRes = await pool.query(`SELECT COUNT(*) as count FROM projects WHERE issues IS NOT NULL AND TRIM(COALESCE(issues, '')) != '' AND TRIM(COALESCE(issues, '')) != '-' ${pFilter}`);
    const openIssues = parseInt(openIssueRes.rows[0].count, 10);

    // Revenue
    const revenueRes = await pool.query(`SELECT SUM(project_value) as total_nilai FROM projects WHERE 1=1 ${pFilter}`);
    const totalNilai = parseInt(revenueRes.rows[0].total_nilai || 0, 10);

    const realisasiRes = await pool.query(`SELECT SUM(project_value) as total_realisasi FROM projects WHERE status = 'Go Live' ${pFilter}`);
    const totalRealisasi = parseInt(realisasiRes.rows[0].total_realisasi || 0, 10);

    // Status Breakdown (Projects)
    const statusBreakdownRes = await pool.query(`SELECT status, COUNT(*) as count, SUM(project_value) as total_value FROM projects WHERE 1=1 ${pFilter} GROUP BY status`);
    
    // Upcoming Milestones (Tasks ending soon)
    const upcomingTasksRes = await pool.query(`
      SELECT t.task_name, t.plan_end_date as end_date, p.project_name 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id 
      WHERE t.status != 'Completed' AND t.plan_end_date >= CURRENT_DATE ${tFilter}
      ORDER BY t.plan_end_date ASC LIMIT 5
    `);

    // Proyek Perlu Perhatian (Projects with issues or on hold)
    const attentionProjectsRes = await pool.query(`
      SELECT p.id, p.project_name, p.status, p.issues, p.baseline_end_date, p.progress,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'Completed') as completed_tasks_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks_count
      FROM projects p
      WHERE ((p.issues IS NOT NULL AND TRIM(COALESCE(p.issues, '')) != '' AND TRIM(COALESCE(p.issues, '')) != '-') 
         OR p.status = 'On Hold') ${pFilter}
      LIMIT 5
    `);

    // Top 5 Projects by Value
    const topProjectsRes = await pool.query(`SELECT project_name, project_value FROM projects WHERE 1=1 ${pFilter} ORDER BY project_value DESC LIMIT 5`);

    // PIC Project Handling Stats
    const picStatsRes = await pool.query(`
      SELECT COALESCE(u.full_name, 'Belum Ada PIC') as pic_name, COUNT(p.id) as total_projects
      FROM projects p
      LEFT JOIN users u ON p.pic_user_id = u.id
      WHERE 1=1 ${pFilter}
      GROUP BY u.full_name
      ORDER BY total_projects DESC
    `);

    // All Projects list for dashboard table
    const projectListRes = await pool.query(`
      SELECT p.id, p.project_name, p.status, p.project_value, p.progress, p.issues, p.baseline_end_date,
             COALESCE(p.actual_end_date, p.baseline_end_date, p.created_at) as go_live_date,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'Completed') as completed_tasks_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks_count,
             m2.name as pic_marketing_name,
             m1.name as product_type_name
      FROM projects p
      LEFT JOIN master_data m2 ON p.pic_marketing_id = m2.id
      LEFT JOIN master_data m1 ON p.product_type_id = m1.id
      WHERE p.status != 'Completed' ${pFilter}
      ORDER BY p.created_at DESC
    `);

    const projectList = projectListRes.rows.map(p => {
      const total = parseInt(p.total_tasks_count, 10);
      const completed = parseInt(p.completed_tasks_count, 10);
      return {
        id: p.id,
        project_name: p.project_name,
        status: p.status,
        project_value: p.project_value,
        go_live_date: p.go_live_date,
        pic_marketing_name: p.pic_marketing_name,
        product_type_name: p.product_type_name,
        progress: p.progress || (total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%')
      };
    });

    res.json({
      metrics: {
        totalProjects,
        totalTasks,
        completedTasks,
        delayedTasks,
        averageProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        openIssues,
        revenue: {
          total: totalNilai,
          kontrak: totalNilai, // Simplified mapping
          realisasi: totalRealisasi,
        }
      },
      statusBreakdown: statusBreakdownRes.rows.map(r => ({
        name: r.status,
        value: parseInt(r.count, 10),
        revenue: parseInt(r.total_value || 0, 10)
      })),
      upcomingMilestones: upcomingTasksRes.rows,
      attentionProjects: attentionProjectsRes.rows,
      topProjects: topProjectsRes.rows,
      picStats: picStatsRes.rows,
      projectList
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
});

// --- BULK IMPORT PROJECT ROUTES ---

// 1. Download Template Excel (with Data Validation)
app.get('/api/projects/export-template', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'APS PM System';
    
    // Main Sheet
    const sheet = workbook.addWorksheet('Template Import Project');
    
    // Headers
    const headerRow = sheet.addRow(['Nama Project', 'PIC Project', 'Jenis Produk', 'PIC Marketing', 'Tanggal Mulai', 'Nilai Project (Rp)']);
    headerRow.font = { bold: true };
    sheet.columns = [
      { width: 35 }, { width: 25 }, { width: 25 }, { width: 25 }, { width: 15 }, { width: 20 }
    ];

    // Master Data Sheet (Hidden)
    const masterSheet = workbook.addWorksheet('MasterData', { state: 'hidden' });
    
    // Fetch PICs
    const usersRes = await pool.query("SELECT full_name FROM users WHERE is_active = true ORDER BY full_name ASC");
    const pics = usersRes.rows.map(r => r.full_name);
    
    // Fetch Product Types
    const productsRes = await pool.query("SELECT name FROM master_data WHERE type = 'JENIS_PRODUK' AND is_active = true ORDER BY name ASC");
    const products = productsRes.rows.map(r => r.name);

    // Fetch Marketing Types
    const marketingRes = await pool.query("SELECT name FROM master_data WHERE type = 'MARKETING' AND is_active = true ORDER BY name ASC");
    const marketings = marketingRes.rows.map(r => r.name);
    
    // Populate Master Data Sheet
    masterSheet.getColumn('A').values = ['PIC List', ...pics];
    masterSheet.getColumn('B').values = ['Product List', ...products];
    masterSheet.getColumn('C').values = ['Marketing List', ...marketings];
    
    // Apply Data Validation to 1000 rows
    for (let i = 2; i <= 1000; i++) {
      // PIC Column (B)
      if (pics.length > 0) {
        sheet.getCell(`B${i}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`MasterData!$A$2:$A$${pics.length + 1}`],
          showErrorMessage: true,
          errorTitle: 'Error PIC',
          error: 'Silakan pilih PIC dari daftar dropdown.'
        };
      }
      // Product Column (C)
      if (products.length > 0) {
        sheet.getCell(`C${i}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`MasterData!$B$2:$B$${products.length + 1}`],
          showErrorMessage: true,
          errorTitle: 'Error Produk',
          error: 'Silakan pilih Jenis Produk dari daftar dropdown.'
        };
      }
      // Marketing Column (D)
      if (marketings.length > 0) {
        sheet.getCell(`D${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`MasterData!$C$2:$C$${marketings.length + 1}`],
          showErrorMessage: true,
          errorTitle: 'Error Marketing',
          error: 'Silakan pilih PIC Marketing dari daftar dropdown.'
        };
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Import_Project.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal membuat template.");
  }
});

// 2. Import Excel
app.post('/api/projects/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File Excel tidak ditemukan" });

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet(1); // Read first sheet
    
    if (!sheet) return res.status(400).json({ error: "Sheet tidak ditemukan" });

    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    
    // Fetch master data for memory mapping
    const usersRes = await pool.query("SELECT id, full_name FROM users WHERE is_active = true");
    const userMap = {};
    usersRes.rows.forEach(u => userMap[u.full_name] = u.id);

    const productsRes = await pool.query("SELECT id, name FROM master_data WHERE type = 'JENIS_PRODUK' AND is_active = true");
    const productMap = {};
    productsRes.rows.forEach(p => productMap[p.name] = p.id);

    const marketingRes = await pool.query("SELECT id, name FROM master_data WHERE type = 'MARKETING' AND is_active = true");
    const marketingMap = {};
    marketingRes.rows.forEach(p => marketingMap[p.name] = p.id);

    // Iterate rows starting from row 2 (skip header)
    const promises = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const projectName = row.getCell(1).text?.trim();
      const picName = row.getCell(2).text?.trim();
      const productName = row.getCell(3).text?.trim();
      const marketingName = row.getCell(4).text?.trim();
      
      let startDateStr = null;
      const startDateRaw = row.getCell(5).value;
      if (startDateRaw) {
         if (startDateRaw instanceof Date) {
             startDateStr = new Date(startDateRaw.getTime() - startDateRaw.getTimezoneOffset() * 60000).toISOString().split('T')[0];
         } else {
             startDateStr = startDateRaw; // Assumes string format if not actual Date
         }
      }

      const projectValueRaw = row.getCell(6).value;
      
      let projectValue = 0;
      if (projectValueRaw !== undefined && projectValueRaw !== null) {
         projectValue = Number(String(projectValueRaw).replace(/,/g, ''));
      }

      if (!projectName) {
        errors.push({ row: rowNumber, name: projectName || '-', error: "Nama Project wajib diisi." });
        failedCount++;
        return;
      }
      if (!picName || !userMap[picName]) {
        errors.push({ row: rowNumber, name: projectName, error: `PIC Project "${picName}" tidak valid atau tidak terdaftar.` });
        failedCount++;
        return;
      }
      if (!productName || !productMap[productName]) {
        errors.push({ row: rowNumber, name: projectName, error: `Jenis Produk "${productName}" tidak valid atau tidak terdaftar.` });
        failedCount++;
        return;
      }
      if (marketingName && !marketingMap[marketingName]) {
        errors.push({ row: rowNumber, name: projectName, error: `PIC Marketing "${marketingName}" tidak valid atau tidak terdaftar.` });
        failedCount++;
        return;
      }
      if (isNaN(projectValue)) {
        errors.push({ row: rowNumber, name: projectName, error: `Nilai Project format tidak valid (harus angka).` });
        failedCount++;
        return;
      }

      // Valid data, queue insert
      const picId = userMap[picName];
      const prodId = productMap[productName];
      const markId = marketingName ? marketingMap[marketingName] : null;
      
      promises.push(
        pool.query(
          "INSERT INTO projects (project_name, status, pic_user_id, product_type_id, pic_marketing_id, baseline_start_date, project_value) VALUES ($1, 'Not Started', $2, $3, $4, $5, $6)",
          [projectName, picId, prodId, markId, startDateStr, projectValue]
        ).then(() => {
          successCount++;
        }).catch(err => {
          errors.push({ row: rowNumber, name: projectName, error: "Gagal menyimpan ke database: " + err.message });
          failedCount++;
        })
      );
    });

    await Promise.all(promises);
    
    res.json({ successCount, failedCount, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memproses file Excel." });
  }
});

// 3. Download Error Log
app.post('/api/projects/import-errors-excel', express.json(), async (req, res) => {
  try {
    const { errors } = req.body;
    if (!errors || !Array.isArray(errors)) return res.status(400).send("Data error tidak valid.");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Log Error Import');
    
    sheet.addRow(['Baris (Row)', 'Nama Project', 'Keterangan Error']);
    sheet.getRow(1).font = { bold: true };
    sheet.columns = [
      { width: 15 }, { width: 40 }, { width: 60 }
    ];

    errors.forEach(e => {
      sheet.addRow([e.row, e.name, e.error]);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Log_Error_Import_Project.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal membuat log error.");
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const allProjects = await pool.query(`
      SELECT p.*, u.full_name as pic_name, m.name as product_type_name, m2.name as pic_marketing_name
      FROM projects p
      LEFT JOIN users u ON p.pic_user_id = u.id
      LEFT JOIN master_data m ON p.product_type_id = m.id
      LEFT JOIN master_data m2 ON p.pic_marketing_id = m2.id
      ORDER BY p.id ASC
    `);
    res.json(allProjects.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan pada server");
  }
});

app.delete('/api/projects/:id', authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("BEGIN");
    
    // Delete history associated with tasks of this project
    await pool.query("DELETE FROM task_history WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)", [id]);
    
    // Delete assignees associated with tasks of this project
    await pool.query("DELETE FROM task_assignees WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)", [id]);
    
    // Delete tasks associated with this project
    await pool.query("DELETE FROM tasks WHERE project_id = $1", [id]);
    
    // Delete the project itself
    await pool.query("DELETE FROM projects WHERE id = $1", [id]);
    
    await pool.query("COMMIT");
    res.json({ message: "Proyek berhasil dihapus" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err.message);
    res.status(500).send("Gagal menghapus proyek");
  }
});

// --- TASKS (WBS) ---
app.post('/api/tasks', async (req, res) => {
  try {
    const { project_id, parent_task_id, task_name, plan_start_date, plan_end_date, plan_hk, status, created_by } = req.body;
    const newTask = await pool.query(
      "INSERT INTO tasks (project_id, parent_task_id, task_name, plan_start_date, plan_end_date, plan_hk, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [project_id, parent_task_id, task_name, plan_start_date, plan_end_date, plan_hk, status]
    );
    const task = newTask.rows[0];

    // Log history
    const userName = created_by || 'Sistem';
    await pool.query(
      "INSERT INTO task_history (task_id, user_name, action, created_at) VALUES ($1, $2, $3, CURRENT_DATE)",
      [task.id, userName, `Tugas WBS "${task_name}" berhasil dibuat.`]
    );

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat membuat tugas WBS");
  }
});

app.get('/api/tasks/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const projectTasks = await pool.query("SELECT * FROM tasks WHERE project_id = $1 ORDER BY id ASC", [projectId]);
    res.json(projectTasks.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan pada server");
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { task_name, plan_start_date, plan_end_date, plan_hk, progress_percentage, status, actual_start_date, actual_end_date, actual_hk, notes, updated_by } = req.body;
    
    const updateTask = await pool.query(
      `UPDATE tasks 
       SET task_name = COALESCE($1, task_name), 
           plan_start_date = COALESCE($2, plan_start_date), 
           plan_end_date = COALESCE($3, plan_end_date), 
           plan_hk = COALESCE($4, plan_hk), 
           progress_percentage = $5, status = $6, actual_start_date = $7, actual_end_date = $8, actual_hk = $9, notes = $10 
       WHERE id = $11 RETURNING *`,
      [task_name, plan_start_date, plan_end_date, plan_hk, progress_percentage, status, actual_start_date, actual_end_date, actual_hk, notes, id]
    );

    const userName = updated_by || 'Sistem';
    let logDetails = `Update progres: ${progress_percentage}%, status: ${status}` + (notes ? `, kendala: "${notes}"` : '');
    if (task_name) logDetails = `Update nama tugas / timeline. ` + logDetails;
    
    await pool.query(
      "INSERT INTO task_history (task_id, user_name, action, created_at) VALUES ($1, $2, $3, CURRENT_DATE)",
      [id, userName, logDetails]
    );

    res.json({ message: "Data tugas berhasil diperbarui!", data: updateTask.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengupdate WBS");
  }
});

// --- DELETE TASK (WBS) ---
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the task has child tasks
    const childCheck = await pool.query("SELECT id FROM tasks WHERE parent_task_id = $1 LIMIT 1", [id]);
    if (childCheck.rows.length > 0) {
      return res.status(400).json({ error: "Tidak dapat menghapus tugas yang memiliki sub-tugas (Induk WBS)." });
    }

    // Delete task history first due to foreign key constraints if any (assuming cascading delete might not be set up)
    await pool.query("DELETE FROM task_history WHERE task_id = $1", [id]);
    
    const deleteOp = await pool.query("DELETE FROM tasks WHERE id = $1 RETURNING *", [id]);
    
    if (deleteOp.rows.length === 0) {
      return res.status(404).json({ error: "Tugas tidak ditemukan." });
    }

    res.json({ message: "Tugas berhasil dihapus." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat menghapus tugas.");
  }
});

// --- TASK HISTORY LOGS ---
app.get('/api/tasks/:taskId/history', async (req, res) => {
  try {
    const { taskId } = req.params;
    const history = await pool.query(
      "SELECT id, task_id, user_name, action, to_char(created_at, 'YYYY-MM-DD') as created_at FROM task_history WHERE task_id = $1 ORDER BY id DESC",
      [taskId]
    );
    res.json(history.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengambil riwayat tugas");
  }
});

// --- TASK ASSIGNEES (PIC) ---
app.post('/api/assign-task', async (req, res) => {
  try {
    const { task_id, user_id, assigned_by } = req.body;
    const newAssignment = await pool.query(
      "INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) RETURNING *",
      [task_id, user_id]
    );

    // Fetch user full name for logging
    const userRes = await pool.query("SELECT full_name FROM users WHERE id = $1", [user_id]);
    const picName = userRes.rows[0] ? userRes.rows[0].full_name : 'User';
    const userName = assigned_by || 'Admin';

    await pool.query(
      "INSERT INTO task_history (task_id, user_name, action, created_at) VALUES ($1, $2, $3, CURRENT_DATE)",
      [task_id, userName, `Menugaskan ${picName} sebagai PIC.`]
    );

    res.json({ message: "PIC berhasil ditugaskan pada WBS ini!", data: newAssignment.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat menugaskan PIC");
  }
});

app.delete('/api/assign-task/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { removed_by } = req.query;

    const assignRes = await pool.query(
      `SELECT ta.task_id, u.full_name FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.id = $1`,
      [id]
    );

    if (assignRes.rows.length > 0) {
      const { task_id, full_name } = assignRes.rows[0];
      const userName = removed_by || 'Admin';
      await pool.query(
        "INSERT INTO task_history (task_id, user_name, action, created_at) VALUES ($1, $2, $3, CURRENT_DATE)",
        [task_id, userName, `Melepas ${full_name} dari PIC tugas.`]
      );
    }

    await pool.query("DELETE FROM task_assignees WHERE id = $1", [id]);
    res.json({ message: "PIC berhasil dilepas dari tugas ini." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat melepas PIC");
  }
});

app.get('/api/task-assignees/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      `SELECT ta.id, ta.task_id, ta.user_id, u.full_name, u.role
       FROM task_assignees ta
       JOIN tasks t ON ta.task_id = t.id
       JOIN users u ON ta.user_id = u.id
       WHERE t.project_id = $1`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengambil data PIC");
  }
});

// --- DASHBOARD SUMMARY ---
app.get('/api/dashboard-summary', async (req, res) => {
  try {
    const projects = await pool.query("SELECT * FROM projects");
    const tasks = await pool.query("SELECT * FROM tasks");
    const today = new Date();

    const projectSummaries = projects.rows.map(proj => {
      const projTasks = tasks.rows.filter(t => t.project_id === proj.id);
      const totalTasks = projTasks.length;
      const completedTasks = projTasks.filter(t => t.status === 'Completed').length;
      const lateTasks = projTasks.filter(t => {
        if (t.status === 'Completed') return false;
        if (!t.plan_end_date) return false;
        return new Date(t.plan_end_date) < today;
      });
      const openIssues = projTasks
        .filter(t => t.notes && t.notes.trim() !== '' && t.status !== 'Completed')
        .map(t => ({ task_name: t.task_name, notes: t.notes }));

      return {
        id: proj.id,
        project_name: proj.project_name,
        status: proj.status,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        late_tasks_count: lateTasks.length,
        health: lateTasks.length > 0 ? 'At_Risk' : 'On_Track',
        open_issues: openIssues,
      };
    });

    res.json({
      total_projects: projects.rows.length,
      total_tasks: tasks.rows.length,
      total_completed: tasks.rows.filter(t => t.status === 'Completed').length,
      total_late: projectSummaries.reduce((sum, p) => sum + p.late_tasks_count, 0),
      projects: projectSummaries,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengambil ringkasan dashboard");
  }
});

// --- EXPORT WBS TO EXCEL ---
app.get('/api/projects/:projectId/export-wbs', async (req, res) => {
  try {
    const { projectId } = req.params;

    // 1. Fetch Project
    const projectRes = await pool.query(`
      SELECT p.*, u.full_name as pic_name, m2.name as pic_marketing_name
      FROM projects p
      LEFT JOIN users u ON p.pic_user_id = u.id
      LEFT JOIN master_data m2 ON p.pic_marketing_id = m2.id
      WHERE p.id = $1
    `, [projectId]);
    if (projectRes.rows.length === 0) {
      return res.status(404).send("Proyek tidak ditemukan");
    }
    const project = projectRes.rows[0];

    // 2. Fetch Tasks
    const tasksRes = await pool.query("SELECT * FROM tasks WHERE project_id = $1 ORDER BY id ASC", [projectId]);
    const tasks = tasksRes.rows;

    // 3. Fetch Task Assignees (PICs)
    const assigneesRes = await pool.query(
      `SELECT ta.task_id, u.full_name
       FROM task_assignees ta
       JOIN tasks t ON ta.task_id = t.id
       JOIN users u ON ta.user_id = u.id
       WHERE t.project_id = $1`,
      [projectId]
    );
    const assigneesByTask = {};
    assigneesRes.rows.forEach(a => {
      if (!assigneesByTask[a.task_id]) assigneesByTask[a.task_id] = [];
      assigneesByTask[a.task_id].push(a.full_name);
    });

    // 4. Sort and code tasks hierarchically
    const byParent = {};
    tasks.forEach(t => {
      const key = t.parent_task_id || 'root';
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(t);
    });

    // Urutkan secara kronologis berdasarkan plan_start_date pada setiap level (seperti di Gantt Chart)
    Object.keys(byParent).forEach(key => {
      byParent[key].sort((a, b) => new Date(a.plan_start_date || 0) - new Date(b.plan_start_date || 0));
    });

    const sortedTasks = [];
    function walk(parentId, level, prefix) {
      const children = byParent[parentId || 'root'] || [];
      children.forEach((t, idx) => {
        const wbsCode = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
        sortedTasks.push({ ...t, level, wbsCode });
        walk(t.id, level + 1, wbsCode);
      });
    }
    walk(null, 0, '');

    // 5. Build Excel Workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'APS PM System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Laporan WBS');

    // Enable grid lines
    sheet.views = [{ showGridLines: true }];

    // Column Definitions
    sheet.columns = [
      { key: 'wbsCode', width: 14 },
      { key: 'taskName', width: 42 },
      { key: 'pic', width: 28 },
      { key: 'planStart', width: 14 },
      { key: 'planEnd', width: 14 },
      { key: 'planHk', width: 10 },
      { key: 'actualStart', width: 14 },
      { key: 'actualEnd', width: 14 },
      { key: 'actualHk', width: 10 },
      { key: 'progress', width: 14 },
      { key: 'status', width: 16 },
      { key: 'notes', width: 35 },
    ];

    // Title Section
    const titleRow = sheet.addRow([`LAPORAN WORK BREAKDOWN STRUCTURE (WBS)`]);
    titleRow.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    sheet.mergeCells('A1:L1');

    const projectRow = sheet.addRow([`Proyek: ${project.project_name}`]);
    projectRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF2563EB' } };
    sheet.mergeCells('A2:L2');

    const metaRow = sheet.addRow([`Tanggal Cetak: ${new Date().toISOString().split('T')[0]}`]);
    metaRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    sheet.mergeCells('A3:L3');

    sheet.addRow([]); // Row 4 Blank

    // Table Header (Row 5)
    const headerRow = sheet.addRow([
      'Kode WBS', 'Nama Tugas WBS', 'PIC (Tim)',
      'Plan Start', 'Plan End', 'Plan HK',
      'Actual Start', 'Actual End', 'Actual HK',
      'Progress', 'Status', 'Catatan / Kendala'
    ]);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' },
      };
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    });

    const formatDate = (dateInput) => {
      if (!dateInput) return '-';
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '-';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${month} ${day} ${year}`;
    };

    // Populate Data Rows
    sortedTasks.forEach((task, idx) => {
      const pics = project.pic_name || '-';
      const formattedTaskName = (task.level > 0 ? '   '.repeat(task.level) + '└ ' : '') + task.task_name;

      const planStartStr = formatDate(task.plan_start_date);
      const planEndStr = formatDate(task.plan_end_date);
      const actualStartStr = formatDate(task.actual_start_date);
      const actualEndStr = formatDate(task.actual_end_date);

      const statusLabel = {
        'Completed': 'Selesai',
        'In_Progress': 'Dalam Proses',
        'Not_Started': 'Belum Dimulai'
      }[task.status] || task.status;

      const row = sheet.addRow([
        task.wbsCode,
        formattedTaskName,
        pics,
        planStartStr,
        planEndStr,
        task.plan_hk !== null && task.plan_hk !== undefined ? task.plan_hk : '-',
        actualStartStr,
        actualEndStr,
        task.actual_hk !== null && task.actual_hk !== undefined ? task.actual_hk : '-',
        (task.progress_percentage || 0) / 100,
        statusLabel,
        task.notes || '-'
      ]);

      const isEven = idx % 2 === 0;
      const isLevel0 = task.level === 0;

      row.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Arial',
          size: 10,
          bold: isLevel0,
          color: { argb: 'FF1E293B' }
        };

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Alignments
        if (colNumber === 1 || colNumber === 4 || colNumber === 5 || colNumber === 7 || colNumber === 8 || colNumber === 11) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 6 || colNumber === 9 || colNumber === 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // Fill background
        if (isLevel0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
        } else if (!isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }

        // Number format for progress (%)
        if (colNumber === 10) {
          cell.numFmt = '0%';
        }
      });
    });

    const safeProjectName = project.project_name.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `Laporan_WBS_${safeProjectName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error saat ekspor WBS ke Excel:', err);
    res.status(500).send("Terjadi kesalahan saat mengekspor laporan ke Excel");
  }
});

// --- DOWNLOAD WBS TEMPLATE ---
app.get('/api/template-wbs', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template WBS');

    worksheet.columns = [
      { header: 'Nama Tugas (Wajib)', key: 'task_name', width: 40 },
      { header: 'Induk Tugas (Opsional)', key: 'parent_name', width: 40 },
      { header: 'Tanggal Mulai (YYYY-MM-DD)', key: 'start_date', width: 30 },
      { header: 'Tanggal Selesai (YYYY-MM-DD)', key: 'end_date', width: 30 },
    ];

    // Add formatting to header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add some example data
    worksheet.addRow({
      task_name: 'Fase Persiapan',
      parent_name: '',
      start_date: '2026-09-01',
      end_date: '2026-09-05'
    });
    worksheet.addRow({
      task_name: 'Kickoff Meeting',
      parent_name: 'Fase Persiapan',
      start_date: '2026-09-01',
      end_date: '2026-09-01'
    });
    worksheet.addRow({
      task_name: 'Analisis Kebutuhan',
      parent_name: 'Fase Persiapan',
      start_date: '2026-09-02',
      end_date: '2026-09-05'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Import_WBS.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error saat download template WBS:', err);
    res.status(500).send("Terjadi kesalahan saat mengunduh template Excel");
  }
});

// --- IMPORT WBS FROM EXCEL ---
app.post('/api/projects/:projectId/import-wbs', upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { projectId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ error: 'File Excel kosong.' });
    }

    const importedTasks = [];
    const nameToIdMap = new Map();

    const existingTasksResult = await client.query('SELECT id, task_name FROM tasks WHERE project_id = $1', [projectId]);
    existingTasksResult.rows.forEach(t => nameToIdMap.set(t.task_name.toLowerCase(), t.id));

    await client.query('BEGIN');

    let errorList = [];
    
    worksheet.eachRow(function(row, rowNumber) {
        if (rowNumber === 1) return; // Skip header

        const taskName = row.getCell(1).text?.trim();
        const parentName = row.getCell(2).text?.trim();
        let planStart = row.getCell(3).value;
        let planEnd = row.getCell(4).value;

        if (!taskName) {
           return;
        }

        const formatDate = (dateVal) => {
            if (dateVal instanceof Date) {
                const yyyy = dateVal.getFullYear();
                const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
                const dd = String(dateVal.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            } else if (typeof dateVal === 'string') {
                const val = dateVal.trim();
                const parts = val.split('/');
                if (parts.length === 3) {
                    // Jika string format "MM/DD/YYYY" atau "M/D/YYYY"
                    const [m, d, y] = parts;
                    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
                return val;
            }
            return null;
        };

        planStart = formatDate(planStart);
        planEnd = formatDate(planEnd);

        if (!planStart || !planEnd) {
           errorList.push(`Baris ${rowNumber}: Tanggal Mulai dan Tanggal Selesai harus diisi/valid.`);
           return;
        }

        let parentTaskId = null;
        if (parentName) {
            if (nameToIdMap.has(parentName.toLowerCase())) {
                parentTaskId = nameToIdMap.get(parentName.toLowerCase());
            } else {
                errorList.push(`Baris ${rowNumber}: Induk tugas '${parentName}' tidak ditemukan.`);
                return;
            }
        }

        let planHk = 1;
        try {
            const startD = new Date(planStart);
            const endD = new Date(planEnd);
            let count = 0;
            let cur = new Date(startD);
            while (cur <= endD) {
                const day = cur.getDay();
                if (day !== 0 && day !== 6) {
                    count++;
                }
                cur.setDate(cur.getDate() + 1);
            }
            planHk = count > 0 ? count : 1;
        } catch (e) {
            planHk = 1;
        }

        const tempId = crypto.randomUUID(); 
        
        importedTasks.push({
            id: tempId,
            project_id: projectId,
            parent_task_id: parentTaskId,
            task_name: taskName,
            plan_start_date: planStart,
            plan_end_date: planEnd,
            plan_hk: planHk,
            status: 'Not Started'
        });

        nameToIdMap.set(taskName.toLowerCase(), tempId);
    });

    if (errorList.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Validasi gagal pada beberapa baris.', details: errorList });
    }

    let insertedCount = 0;
    const tempIdToDbId = {};

    for (const task of importedTasks) {
        let parentIdToInsert = task.parent_task_id;
        if (parentIdToInsert && tempIdToDbId[parentIdToInsert]) {
            parentIdToInsert = tempIdToDbId[parentIdToInsert];
        }

        const resTask = await client.query(
            "INSERT INTO tasks (project_id, parent_task_id, task_name, plan_start_date, plan_end_date, plan_hk, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            [task.project_id, parentIdToInsert, task.task_name, task.plan_start_date, task.plan_end_date, task.plan_hk, task.status]
        );
        const newDbId = resTask.rows[0].id;
        tempIdToDbId[task.id] = newDbId;
        
        insertedCount++;
        // log history
        await client.query(
            "INSERT INTO task_history (task_id, user_name, action, created_at) VALUES ($1, $2, $3, CURRENT_DATE)",
            [newDbId, 'Sistem (Impor)', `Tugas WBS "${task.task_name}" diimpor dari Excel.`]
        );
    }

    await client.query('COMMIT');
    res.json({ message: `Berhasil mengimpor ${insertedCount} tugas.`, count: insertedCount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saat impor WBS dari Excel:', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal server saat mengimpor data.' });
  } finally {
    client.release();
  }
});

// === ENDPOINTS MODUL ENTERPRISE ===

app.get('/api/onsite-schedules', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM onsite_schedules WHERE status != 'Selesai' ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching onsite schedules:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

app.post('/api/onsite-schedules', async (req, res) => {
  try {
    const { pic_names, role, location, status, start_date, end_date, health } = req.body;
    const result = await pool.query(
      `INSERT INTO onsite_schedules (pic_names, role, location, status, start_date, end_date, health) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [JSON.stringify(pic_names), role, location, status, start_date, end_date, health]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating onsite schedule:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

app.put('/api/onsite-schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pic_names, role, location, status, start_date, end_date, health } = req.body;
    const result = await pool.query(
      `UPDATE onsite_schedules 
       SET pic_names = $1, role = $2, location = $3, status = $4, start_date = $5, end_date = $6, health = $7 
       WHERE id = $8 RETURNING *`,
      [JSON.stringify(pic_names), role, location, status, start_date, end_date, health, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating onsite schedule:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

app.delete('/api/onsite-schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM onsite_schedules WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    res.json({ message: 'Jadwal berhasil dihapus.' });
  } catch (err) {
    console.error('Error deleting onsite schedule:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reports ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// --- OVERTIME ---
app.get('/api/overtime', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, u.full_name as user_name 
      FROM overtime_requests o 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching overtime:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

app.post('/api/overtime', uploadDisk.single('evidence'), async (req, res) => {
  try {
    const { user_id, department, overtime_date, is_holiday, start_time, end_time, hours, reason } = req.body;
    let evidence_url = null;
    if (req.file) {
      evidence_url = '/uploads/' + req.file.filename;
    }
    
    const newRequest = await pool.query(
      `INSERT INTO overtime_requests (user_id, department, overtime_date, is_holiday, start_time, end_time, hours, reason, evidence_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [user_id, department, overtime_date, is_holiday === 'true' || is_holiday === true, start_time, end_time, hours, reason, evidence_url]
    );
    res.json(newRequest.rows[0]);
  } catch (err) {
    console.error('Error creating overtime:', err);
    res.status(500).json({ error: 'Gagal mengajukan lembur.' });
  }
});

app.put('/api/overtime/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE overtime_requests SET status = 'Approved' WHERE id = $1 RETURNING *",
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error approving overtime:', err);
    res.status(500).json({ error: 'Gagal menyetujui lembur.' });
  }
});

app.delete('/api/overtime/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM overtime_requests WHERE id = $1', [id]);
    res.json({ message: 'Lembur berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting overtime:', err);
    res.status(500).json({ error: 'Gagal menghapus lembur.' });
  }
});

// --- DOCUMENT TRACKING ---
const docTrackingStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './uploads/doc-tracking';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
        cb(null, 'doc-' + uniqueSuffix + '-' + cleanName);
    }
});
const uploadDoc = multer({ 
    storage: docTrackingStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Tipe file tidak diizinkan! Harap unggah PDF atau Gambar.'), false);
        }
    }
});

// --- DOCUMENT HANDOVERS API ---

app.get('/api/handovers', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT h.*, 
                   s.full_name as sender_name, 
                   r.full_name as receiver_name,
                   dt.no_pengajuan
            FROM document_handovers h
            LEFT JOIN users s ON h.sender_id = s.id
            LEFT JOIN users r ON h.receiver_id = r.id
            LEFT JOIN document_tracking dt ON h.document_id = dt.id
            ORDER BY h.tanggal_diberikan DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching handovers:', err);
        res.status(500).json({ error: 'Gagal mengambil data serah terima.' });
    }
});

app.get('/api/handovers/:document_id', async (req, res) => {
    try {
        const { document_id } = req.params;
        const result = await pool.query(`
            SELECT h.*, 
                   s.full_name as sender_name, 
                   r.full_name as receiver_name 
            FROM document_handovers h
            LEFT JOIN users s ON h.sender_id = s.id
            LEFT JOIN users r ON h.receiver_id = r.id
            WHERE h.document_id = $1
            ORDER BY h.tanggal_diberikan DESC
        `, [document_id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching handovers:', err);
        res.status(500).json({ error: 'Gagal mengambil riwayat serah terima.' });
    }
});

app.post('/api/handovers', async (req, res) => {
    try {
        const { document_id, sender_id, receiver_id, nama_dokumen, catatan } = req.body;
        if (!sender_id || !receiver_id) return res.status(400).json({ error: 'Pengirim dan Penerima tidak boleh kosong.' });
        if (String(sender_id) === String(receiver_id)) return res.status(400).json({ error: 'Pengirim dan Penerima tidak boleh sama.' });

        const result = await pool.query(
            `INSERT INTO document_handovers (document_id, sender_id, receiver_id, nama_dokumen, catatan, status)
             VALUES ($1, $2, $3, $4, $5, 'DIBERIKAN') RETURNING *`,
            [document_id, sender_id, receiver_id, nama_dokumen, catatan || null]
        );
        res.json({ message: 'Serah terima berhasil dicatat.', data: result.rows[0] });
    } catch (err) {
        console.error('Error creating handover:', err);
        res.status(500).json({ error: 'Gagal mencatat serah terima.' });
    }
});

app.put('/api/handovers/:id/receive', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE document_handovers 
             SET status = 'DITERIMA', tanggal_diterima = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Data serah terima tidak ditemukan.' });
        res.json({ message: 'Dokumen berhasil dikonfirmasi diterima.', data: result.rows[0] });
    } catch (err) {
        console.error('Error receiving handover:', err);
        res.status(500).json({ error: 'Gagal mengonfirmasi serah terima.' });
    }
});

// --- END DOCUMENT HANDOVERS API ---

app.get('/api/document-tracking', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT dt.*, md.name AS vendor_name 
            FROM document_tracking dt 
            LEFT JOIN master_data md ON dt.vendor_id = md.id 
            ORDER BY dt.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching document tracking:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Create new (Tahap Pengajuan)
const docFields = [
    { name: 'file_pm', maxCount: 1 },
    { name: 'file_pr', maxCount: 1 },
    { name: 'file_po', maxCount: 1 },
    { name: 'file_implementasi', maxCount: 1 },
    { name: 'file_bast', maxCount: 1 }
];

app.post('/api/document-tracking', uploadDoc.fields(docFields), async (req, res) => {
    try {
        const { vendor_id, marketing_pic_id, nama_project, no_pengajuan, kebutuhan, keterangan, nilai_estimasi, pm_date, pm_pic, status, last_updated_by } = req.body;
        
        // Find if file_pm is uploaded
        const file_pm = req.files?.file_pm?.[0] ? `/uploads/doc-tracking/${req.files.file_pm[0].filename}` : null;
        
        const sanitize = (val) => (val === "" || val === "null" || val === undefined) ? null : val;

        const result = await pool.query(
            `INSERT INTO document_tracking (vendor_id, marketing_pic_id, nama_project, no_pengajuan, kebutuhan, keterangan, nilai_estimasi, file_pm, pm_date, pm_pic, status, last_updated_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [sanitize(vendor_id), sanitize(marketing_pic_id), sanitize(nama_project), sanitize(no_pengajuan), sanitize(kebutuhan), sanitize(keterangan), sanitize(nilai_estimasi), file_pm, sanitize(pm_date), sanitize(pm_pic), status || 'PENGAJUAN', sanitize(last_updated_by)]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating document tracking:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server saat menyimpan pengajuan.' });
    }
});

// Update Keterangan Only
app.put('/api/document-tracking/:id/keterangan', express.json(), async (req, res) => {
    try {
        const { id } = req.params;
        const { keterangan } = req.body;
        
        const result = await pool.query(
            `UPDATE document_tracking SET keterangan = $1, last_updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
            [keterangan, id]
        );
        
        // Handle wrapper difference
        const returningData = result.rows || result;
        if (!returningData || returningData.length === 0) {
             return res.status(404).json({ error: 'Data tidak ditemukan.' });
        }
        res.json(Array.isArray(returningData) ? returningData[0] : returningData);
    } catch (err) {
        console.error('Error updating keterangan:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

// Update (All stages)
app.put('/api/document-tracking/:id', uploadDoc.fields(docFields), async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        
        // Handle files uploaded with fields
        const fileUpdates = {};
        if (req.files) {
            Object.keys(req.files).forEach(fieldname => {
                fileUpdates[fieldname] = `/uploads/doc-tracking/${req.files[fieldname][0].filename}`;
            });
        }

        // Merge body and file updates
        const updateData = { ...body, ...fileUpdates };

        // VALIDASI SEKUENSIAL PENCEGAHAN BUG
        const status = updateData.status;
        const current = await pool.query(`SELECT * FROM document_tracking WHERE id = $1`, [id]);
        if (!current.rows || current.rows.length === 0) return res.status(404).json({ error: 'Data tidak ditemukan.' });
        const currData = current.rows[0];

        if (status === 'PO ISSUED') {
            const checkPrApprovedDate = updateData.pr_approved_date || currData.pr_approved_date;
            const checkFilePr = updateData.file_pr || currData.file_pr;
            if (!checkPrApprovedDate || !checkFilePr) {
                return res.status(400).json({ error: 'Validasi Gagal: Dokumen PR & Tanggal Approve PR wajib diisi sebelum status PO ISSUED.' });
            }
        }
        
        if (status === 'IMPLEMENTASI') {
            const checkFilePo = updateData.file_po || currData.file_po;
            if (!checkFilePo) {
                return res.status(400).json({ error: 'Validasi Gagal: Dokumen PO wajib diisi sebelum masuk ke tahap IMPLEMENTASI.' });
            }
        }

        // Build Dynamic UPDATE query
        let setClauses = [];
        let params = [];
        let paramIndex = 1;
        for (const key in updateData) {
            // only update allowed keys
            const allowedKeys = ['vendor_id', 'marketing_pic_id', 'nama_project', 'no_pengajuan', 'kebutuhan', 'nilai_estimasi', 'file_pm', 'pm_date', 'pm_pic', 
                'no_pr', 'file_pr', 'pr_submitted_date', 'pr_approved_date', 'pr_pic', 
                'no_po', 'nilai_final', 'file_po', 'po_date', 'po_pic', 
                'file_implementasi', 'implementasi_date', 'file_bast', 'bast_date', 'completed_date', 
                'status', 'last_updated_by'];
            if (allowedKeys.includes(key)) {
                let value = updateData[key];
                
                // Handle empty strings for numbers/foreign keys/dates/text
                if (value === '' || value === 'null') {
                    value = null;
                }
                
                if (value === 'null' || value === null) {
                    setClauses.push(`${key} = NULL`);
                } else {
                    setClauses.push(`${key} = $${paramIndex}`);
                    params.push(value);
                    paramIndex++;
                }
            }
        }
        
        setClauses.push(`last_updated_at = CURRENT_TIMESTAMP`);
        params.push(id);
        
        const updateQuery = `UPDATE document_tracking SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        await pool.query(updateQuery, params);
        
        // Ambil data terbaru untuk dikembalikan ke frontend
        const updatedDoc = await pool.query(`SELECT * FROM document_tracking WHERE id = $1`, [id]);
        res.json(updatedDoc.rows[0]);
    } catch (err) {
        console.error('Error updating document tracking:', err);
        res.status(500).json({ error: 'Terjadi kesalahan saat update data: ' + err.message });
    }
});

app.delete('/api/document-tracking/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM document_tracking WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Data tidak ditemukan.' });
        res.json({ message: 'Data berhasil dihapus.' });
    } catch (err) {
        console.error('Error deleting document tracking:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
});

httpServer.listen(port, () => {
  console.log(`[INFO] Server Backend siap diakses pada: http://localhost:${port}`);
});

