const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');

module.exports = function initializeSecurityFramework(app, pool, processEnv) {
  // --- 1. HTTP SECURITY HEADERS (OWASP) ---
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'self'", processEnv.FRONTEND_URL || 'http://localhost:5173'],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: false, // Digantikan oleh CSP frameAncestors
  }));

  // --- 2. XSS SANITIZER MIDDLEWARE ---
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') obj[key] = xss(obj[key]);
      else if (typeof obj[key] === 'object' && obj[key] !== null) sanitizeObject(obj[key]);
    }
  };
  const xssSanitizer = (req, res, next) => {
    if (req.body) sanitizeObject(req.body);
    next();
  };
  app.use(xssSanitizer);

  // --- 3. APPLICATION-LEVEL CRYPTOGRAPHY (AES-256-GCM) ---
  const ENCRYPTION_KEY = crypto.scryptSync(processEnv.JWT_SECRET || 'rahasia-negara-sangat-aman', 'salt', 32);
  const IV_LENGTH = 16; 
  const encryptAES = (text) => {
    if (!text) return text;
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
      let encrypted = cipher.update(String(text), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      return iv.toString('hex') + ':' + authTag + ':' + encrypted;
    } catch (err) { return text; }
  };
  const decryptAES = (text) => {
    if (!text || typeof text !== 'string' || !text.includes(':')) return text;
    try {
      const parts = text.split(':');
      if (parts.length !== 3) return text;
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = Buffer.from(parts[2], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) { return text; }
  };

  // --- 4. ASYMMETRIC JWT KEY MANAGEMENT (RS256) & AUTO-ROTATION ---
  let jwtKeyCache = new Map();
  let activeJwtKeyId = null;

  const refreshJwtKeys = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS jwt_keys (
          kid VARCHAR(255) PRIMARY KEY,
          private_key TEXT NOT NULL,
          public_key TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT FALSE
        )
      `);

      const keysRes = await pool.query("SELECT * FROM jwt_keys");
      jwtKeyCache.clear();
      keysRes.rows.forEach(k => jwtKeyCache.set(k.kid, k));

      let activeKey = keysRes.rows.find(k => k.is_active);
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      
      if (!activeKey || (Date.now() - new Date(activeKey.created_at).getTime() > thirtyDaysMs)) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        const newKid = crypto.randomUUID();
        
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("UPDATE jwt_keys SET is_active = FALSE WHERE is_active = TRUE");
          await client.query(
            "INSERT INTO jwt_keys (kid, private_key, public_key, is_active) VALUES ($1, $2, $3, TRUE)",
            [newKid, privateKey, publicKey]
          );
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
        
        activeKey = { kid: newKid, private_key: privateKey, public_key: publicKey, is_active: true };
        jwtKeyCache.set(newKid, activeKey);
      }
      activeJwtKeyId = activeKey.kid;
    } catch (err) {
      console.error("Error managing JWT keys:", err.message);
    }
  };

  // --- 5. AUDIT TRAIL LOGGER & REAL-TIME ANOMALY RESPONSE ---
  const anomalyTracker = new Map();
  const blockedIPs = new Map();
  const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  const auditLog = (event, userId, req, details) => {
    const clientIP = req ? (req.ip || req.socket?.remoteAddress || 'UNKNOWN') : 'UNKNOWN';
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      user_id: userId || 'GUEST',
      ip_address: clientIP,
      details
    };
    console.log(JSON.stringify({ AUDIT_TRAIL: logEntry }));

    const suspiciousEvents = ['LOGIN_FAILED', 'RATE_LIMIT_EXCEEDED', 'UNAUTHORIZED_ACCESS', 'HONEYPOT_TRIGGERED'];
    if (suspiciousEvents.includes(event) && clientIP !== 'UNKNOWN') {
      const now = Date.now();
      const timestamps = anomalyTracker.get(clientIP) || [];
      const recentTimestamps = timestamps.filter(ts => now - ts < 10000);
      recentTimestamps.push(now);
      anomalyTracker.set(clientIP, recentTimestamps);

      if (recentTimestamps.length >= 5 || event === 'HONEYPOT_TRIGGERED') {
        blockedIPs.set(clientIP, now + BLOCK_DURATION_MS);
        anomalyTracker.delete(clientIP);
        
        console.log(JSON.stringify({ AUDIT_TRAIL: { timestamp: new Date().toISOString(), event: 'ANOMALY_DETECTED', details: `Blocked IP ${clientIP} for 24h due to anomalies/honeypot.` }}));

        if (userId && userId !== 'GUEST' && userId !== 'SYSTEM') {
          pool.query("UPDATE users SET session_token = $1 WHERE id = $2", [crypto.randomUUID(), userId]).catch(e => {});
        } else if (details && details.username) {
          pool.query("UPDATE users SET session_token = $1 WHERE username = $2", [crypto.randomUUID(), details.username]).catch(e => {});
        }
      }
    }
  };

  // --- 6. HONEYPOT & IP BLOCKLIST MIDDLEWARE ---
  app.use((req, res, next) => {
    const clientIP = req.ip || req.socket.remoteAddress;
    if (blockedIPs.has(clientIP)) {
      if (Date.now() > blockedIPs.get(clientIP)) {
        blockedIPs.delete(clientIP);
      } else {
        return res.status(403).json({ error: "Access Denied. IP Temporarily Blacklisted due to suspicious activity." });
      }
    }
    next();
  });

  const honeypotHandler = (req, res) => {
    const clientIP = req.ip || req.socket.remoteAddress;
    auditLog('HONEYPOT_TRIGGERED', 'SYSTEM', req, { path: req.originalUrl, ip_address: clientIP });
    res.status(200).json({ status: "success", data: { config_version: "v1.2.4", db_dump_url: "https://example.com/fake-dump.sql.gz", token: "mock_admin_token_abcdef123456", users: 1054 } });
  };

  const honeypotRoutes = ['/api/admin/config', '/api/backup/db', '/.env', '/wp-login.php', '/api/v1/users/export', '/admin/settings'];
  honeypotRoutes.forEach(route => app.all(route, honeypotHandler));

  // --- 7. RATE LIMITERS ---
  const limiters = {
    apiLimiter: rateLimit({ 
      windowMs: 15 * 60 * 1000, max: 1000, 
      message: { message: 'Terlalu banyak permintaan dari IP Anda, silakan coba lagi nanti.' },
      handler: (req, res, next, options) => {
        auditLog('RATE_LIMIT_EXCEEDED', req.user ? req.user.id : null, req, { limit_type: 'Global API', max: options.max });
        res.status(options.statusCode).send(options.message);
      }
    }),
    loginLimiter: rateLimit({ 
      windowMs: 15 * 60 * 1000, max: 20, 
      message: { message: 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit.' },
      handler: (req, res, next, options) => {
        auditLog('RATE_LIMIT_EXCEEDED', null, req, { limit_type: 'Login API', max: options.max });
        res.status(options.statusCode).send(options.message);
      }
    }),
    heavyLimiter: rateLimit({
      windowMs: 15 * 60 * 1000, max: 100, 
      message: { message: 'Terlalu banyak memuat data kompleks. Harap tunggu sesaat agar server tidak terbebani.' },
      handler: (req, res, next, options) => {
        auditLog('RATE_LIMIT_EXCEEDED', req.user ? req.user.id : null, req, { limit_type: 'Heavy DB Queries', max: options.max });
        res.status(options.statusCode).send(options.message);
      }
    })
  };
  app.use('/api', limiters.apiLimiter);

  // --- 8. AUTHENTICATION & DR CIRCUIT BREAKER ---
  const authenticateToken = (req, res, next) => {
    if (req.path === '/login' || req.path === '/login/') return next();

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Akses ditolak: Token tidak ditemukan' });

    const decodedHeader = jwt.decode(token, { complete: true });
    
    const verifyDbSession = async (decoded) => {
      try {
        const result = await pool.query("SELECT session_token, is_active FROM users WHERE id = $1", [decoded.id]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'User tidak ditemukan' });
        if (!result.rows[0].is_active) return res.status(403).json({ message: 'Akun Anda telah dinonaktifkan.' });
        if (result.rows[0].session_token !== decoded.session_token) return res.status(401).json({ message: 'Sesi tidak valid (akun login di perangkat lain)' });
        req.user = decoded;
        next();
      } catch (dbErr) {
        if (dbErr.code === 'ECONNREFUSED' || dbErr.code === 'ENOTFOUND' || dbErr.code === 'EHOSTUNREACH' || dbErr.code === 'ETIMEDOUT' || !dbErr.code) {
          console.warn("[DR CIRCUIT BREAKER] DB Offline. Bypassing session revocation check to prevent session loss for user: " + decoded.username);
          req.user = decoded;
          req.isEmergencyMode = true; 
          return next();
        }
        res.status(500).json({ message: 'Kesalahan internal server saat verifikasi' });
      }
    };

    if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
      return jwt.verify(token, processEnv.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Sesi kedaluwarsa atau token tidak valid' });
        verifyDbSession(decoded);
      });
    }

    const kid = decodedHeader.header.kid;
    const keyData = jwtKeyCache.get(kid);
    if (!keyData) return res.status(401).json({ message: 'Sesi ditolak: Kunci kriptografi tidak dikenali.' });

    jwt.verify(token, keyData.public_key, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Sesi kedaluwarsa atau token tidak valid' });
      verifyDbSession(decoded);
    });
  };

  // --- HELPER UNTUK MEMBUAT TOKEN LOGIN BARU ---
  const generateAuthToken = (safeUser) => {
    if (!activeJwtKeyId || !jwtKeyCache.has(activeJwtKeyId)) {
        throw new Error("Sistem kunci RS256 belum siap.");
    }
    return jwt.sign(safeUser, jwtKeyCache.get(activeJwtKeyId).private_key, { 
      algorithm: 'RS256', 
      keyid: activeJwtKeyId, 
      expiresIn: '40m' 
    });
  };

  // Return utilitas yang bisa dipakai di file aplikasi utama
  return {
    auditLog,
    encryptAES,
    decryptAES,
    refreshJwtKeys,
    authenticateToken,
    generateAuthToken,
    limiters
  };
};
