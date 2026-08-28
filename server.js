require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// config & middlewares
const { mysqlPool } = require('./config/db');
const { checkAnomaly, configureHelmet, getCorsOrigins } = require('./middlewares/security');
const { initJTS } = require('./config/jts');

// Initialize app
const app = express();
app.set('trust proxy', 1);

// Initialize JTS
initJTS().catch(err => {
    console.error('[FATAL] Gagal inisialisasi JTS:', err);
    process.exit(1);
});

// SCALAR API DOCUMENTATION
const { apiReference } = require('@scalar/express-api-reference');
const openapiDocument = require('./openapi.json');
app.use(
  '/reference',
  apiReference({
    spec: {
      content: openapiDocument,
    },
    theme: 'purple',
    layout: 'modern'
  })
);

// HTTP SECURITY HEADERS (OWASP)
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

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));
  
  try {
    const { getResourceServer } = require('./config/jts');
    const resourceServer = getResourceServer();
    const result = await resourceServer.verify(token);
    
    if (!result.valid) return next(new Error('unauthorized'));
    socket.user = result.payload;
    next();
  } catch (err) {
    return next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}, User: ${socket.user?.username}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Inject io into request object for controllers to use
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await mysqlPool.query('SELECT 1');
        res.status(200).json({ status: 'OK', database: 'Connected (MySQL)' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', database: 'Disconnected' });
    }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API ROUTES (CLEAN ARCHITECTURE PHASE 2) ---
const apiRoutes = require('./routes/index');
app.use('/api', apiRoutes);

// --- HONEYPOT CATCH-ALL (Unmatched Routes) ---
const { honeypotTrap } = require('./middlewares/security');
app.use(honeypotTrap);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(500).json({ message: 'Terjadi kesalahan internal pada server.', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Connect to Redis (Graceful Fallback)
const cacheManager = require('./config/redis');
cacheManager.connect();

// Graceful Shutdown
const shutdown = () => {
    console.log('[SYSTEM] Shutting down gracefully...');
    httpServer.close(() => {
        console.log('[SYSTEM] HTTP server closed.');
        mysqlPool.end()
            .then(() => {
                console.log('[SYSTEM] MySQL pool closed.');
                process.exit(0);
            })
            .catch(err => {
                console.error('[SYSTEM] Error during MySQL pool shutdown:', err);
                process.exit(1);
            });
    });
};

process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    shutdown();
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown();
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start Server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[SYSTEM] Server berjalan di port ${PORT}`);
});
