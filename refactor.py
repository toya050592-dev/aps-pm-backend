import os
import re

server_path = r"d:\PROJECT APS PM\server.js"

with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Generate the new top section
new_top = """require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const fs = require('fs');

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

// Socket.io Auth
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
  console.log(`[Socket.io] Client connected: ${socket.id}, User: ${socket.user?.username}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'OK', database: 'Connected' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
    }
});

// Graceful Shutdown
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

// Honeypots
app.all('/api/admin/config', honeypotTrap);
app.all('/api/backup/db', honeypotTrap);
app.all('/.env', honeypotTrap);
app.all('/wp-login.php', honeypotTrap);
app.all('/admin/settings', honeypotTrap);

// Global Limiters
app.use('/api', apiLimiter);

app.use('/api', authenticateToken);
app.use('/uploads', authenticateToken, express.static('uploads'));

app.use((req, res, next) => {
  req.io = io;
  next();
});

"""

# We need to find the start of the initDB block which is line 673: `(async function initDB() {`
idx = content.find('(async function initDB() {')

if idx != -1:
    remaining_code = content[idx:]
    # Now write the new server.js
    with open(server_path, 'w', encoding='utf-8') as f:
        f.write(new_top + remaining_code)
    print("Successfully replaced top of server.js")
else:
    print("Could not find initDB block")
