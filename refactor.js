const fs = require('fs');

const serverPath = 'd:\\PROJECT APS PM\\server.js';
let content = fs.readFileSync(serverPath, 'utf8');

const newTop = `require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const fs = require('fs');
const bcrypt = require('bcryptjs'); 
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const { pool, mysqlPool } = require('./config/db');
const { encryptAES, decryptAES, dummyBcryptCompare } = require('./utils/crypto');
const { upload, uploadDisk, uploadBast, uploadDoc, docFields, validateMagicBytes } = require('./middlewares/upload');
const { checkAnomaly, apiLimiter, loginLimiter, exportImportLimiter, configureHelmet, getCorsOrigins, auditLog, honeypotTrap } = require('./middlewares/security');
const { authenticateToken, authorizeAdmin, sessionCache } = require('./middlewares/auth');

const app = express();
app.set('trust proxy', 1);

// --- HTTP SECURITY HEADERS (OWASP) ---
app.use(configureHelmet());
app.use(cors({ origin: getCorsOrigins(), methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(checkAnomaly);

const http = require('http');
const httpServer = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(httpServer, {
  cors: {
    origin: getCorsOrigins(),
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));
  
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
    if (err) return next(new Error('unauthorized'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(\`[Socket.io] Client connected: \${socket.id}, User: \${socket.user?.username}\`);
  socket.on('disconnect', () => {
    console.log(\`[Socket.io] Client disconnected: \${socket.id}\`);
  });
});

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'OK', database: 'Connected' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
    }
});

const shutdown = () => {
    console.log('[SYSTEM] Shutting down gracefully...');
    httpServer.close(() => {
        console.log('[SYSTEM] HTTP server closed.');
        mysqlPool.end().then(() => {
            console.log('[SYSTEM] DB Pool closed.');
            process.exit(0);
        });
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.all('/api/admin/config', honeypotTrap);
app.all('/api/backup/db', honeypotTrap);
app.all('/.env', honeypotTrap);
app.all('/wp-login.php', honeypotTrap);
app.all('/admin/settings', honeypotTrap);

app.use('/api', apiLimiter);
app.use('/api', authenticateToken);
app.use('/uploads', authenticateToken, express.static('uploads'));

app.use((req, res, next) => {
  req.io = io;
  next();
});

`;

const docTrackingStr = `// --- DOCUMENT TRACKING ---
const docTrackingStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './uploads/doc-tracking';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, crypto.randomUUID() + (ext || '.pdf'));
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

const docFields = [
    { name: 'file_pm', maxCount: 1 },
    { name: 'file_pr', maxCount: 1 },
    { name: 'file_po', maxCount: 1 },
    { name: 'file_implementasi', maxCount: 1 },
    { name: 'file_bast', maxCount: 1 }
];`;

content = content.replace(docTrackingStr, '');

const idx = content.indexOf('(async function initDB() {');

if (idx !== -1) {
    const remainingCode = content.substring(idx);
    fs.writeFileSync(serverPath, newTop + remainingCode, 'utf8');
    console.log("Successfully replaced top of server.js");
} else {
    console.log("Could not find initDB block");
}
