const rateLimit = require('express-rate-limit');
const { MemoryStore } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const crypto = require('crypto');
const helmet = require('helmet');
const { mysqlPool } = require('../config/db');
const cacheManager = require('../config/redis');

const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const createHybridStore = (prefix) => {
    let redisStore;
    const memoryStoreFallback = new MemoryStore();
    return {
        init: (options) => {
            const rawClient = cacheManager.getRawClient();
            if (rawClient) {
                redisStore = new RedisStore({
                    sendCommand: (...args) => rawClient.sendCommand(args),
                    prefix: prefix
                });
                redisStore.init(options);
            }
            memoryStoreFallback.init(options);
        },
        increment: async (key) => {
            if (cacheManager.isRedisConnected && redisStore) {
                try { return await redisStore.increment(key); } catch(e){}
            }
            return memoryStoreFallback.increment(key);
        },
        decrement: async (key) => {
            if (cacheManager.isRedisConnected && redisStore) {
                try { return await redisStore.decrement(key); } catch(e){}
            }
            return memoryStoreFallback.decrement(key);
        },
        resetKey: async (key) => {
            if (cacheManager.isRedisConnected && redisStore) {
                try { return await redisStore.resetKey(key); } catch(e){}
            }
            return memoryStoreFallback.resetKey(key);
        }
    };
};

const checkAnomaly = async (req, res, next) => {
    const clientIP = req.ip || req.socket.remoteAddress;
    const isBlocked = await cacheManager.get(`block:${clientIP}`);
    
    if (isBlocked) {
        return res.status(403).json({ message: 'IP address permanently blocked due to suspicious activity.' });
    }
    next();
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  store: createHybridStore('rl:api:'),
  message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi setelah 15 menit',
  handler: (req, res, next, options) => {
    auditLog('RATE_LIMIT_EXCEEDED', null, req, { limit: options.max });
    res.status(options.statusCode).send(options.message);
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: createHybridStore('rl:login:'),
  message: 'Terlalu banyak percobaan login dari IP ini, silakan coba lagi setelah 15 menit',
  handler: (req, res, next, options) => {
    auditLog('RATE_LIMIT_EXCEEDED', null, req, { endpoint: 'login' });
    res.status(options.statusCode).send(options.message);
  }
});

const exportImportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: createHybridStore('rl:export:'),
  message: 'Batas permintaan ekspor/impor tercapai. Silakan coba lagi nanti.'
});

const heavyLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  store: createHybridStore('rl:heavy:'),
  message: { message: 'Terlalu banyak memuat data kompleks.' }, 
  handler: (req, res, next, options) => { 
    auditLog('RATE_LIMIT_EXCEEDED', null, req, { limit_type: 'Heavy', max: options.max }); 
    res.status(options.statusCode).send(options.message); 
  } 
});

const getCorsOrigins = () => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.split(',').map(url => url.trim());
  }
  return ['http://localhost:5173'];
};

const configureHelmet = () => helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173', process.env.PRODUCTION_URL].filter(Boolean),
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      upgradeInsecureRequests: null
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: false
});

const auditLog = async (event, userId, req, details) => {
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
    const anomalyKey = (event === 'LOGIN_FAILED' && details?.username) ? `${clientIP}_${details.username}` : clientIP;
    
    // Count hits in a 10s window roughly using cacheManager
    const trackerKey = `anomaly:${anomalyKey}`;
    const hits = await cacheManager.incr(trackerKey);
    if (hits === 1) await cacheManager.expire(trackerKey, 10); // 10s window

    if (hits >= 5 || event === 'HONEYPOT_TRIGGERED') {
      const penaltyKey = `penalty:${anomalyKey}`;
      const penalties = await cacheManager.incr(penaltyKey);
      if (penalties === 1) await cacheManager.expire(penaltyKey, 86400); // 1 day memory of penalty

      const duration = (penalties === 1 && event !== 'HONEYPOT_TRIGGERED') ? 15 * 60 : (BLOCK_DURATION_MS / 1000);
      
      await cacheManager.setEx(`block:${anomalyKey}`, duration, 'true');
      await cacheManager.expire(trackerKey, 0); // clear the anomaly tracker
      
      console.log(JSON.stringify({ AUDIT_TRAIL: { timestamp: new Date().toISOString(), event: 'ANOMALY_DETECTED', details: `Blocked ${anomalyKey} for ${duration/60}m. Escalation level: ${penalties}.` }}));

      if (event !== 'LOGIN_FAILED') {
        const revokeSession = async () => {
          try {
            let oldSessionRes;
            if (userId && userId !== 'GUEST' && userId !== 'SYSTEM') {
              [oldSessionRes] = await mysqlPool.query("SELECT session_token FROM users WHERE id = ?", [userId]);
              await mysqlPool.query("UPDATE users SET session_token = ? WHERE id = ?", [crypto.randomUUID(), userId]);
            } else if (details && details.username) {
              [oldSessionRes] = await mysqlPool.query("SELECT session_token, id FROM users WHERE username = ?", [details.username]);
              await mysqlPool.query("UPDATE users SET session_token = ? WHERE username = ?", [crypto.randomUUID(), details.username]);
            }
            
            if (oldSessionRes && oldSessionRes.length > 0) {
              const oldToken = oldSessionRes[0].session_token;
              await cacheManager.expire(`sess:${oldToken}`, 0); // Remove session from Redis
              console.log(JSON.stringify({ AUDIT_TRAIL: { timestamp: new Date().toISOString(), event: 'SESSION_REVOKED', user_id: userId, details: "Revoked session due to anomaly." }}));
            }
          } catch (e) {
            console.error("Failed to revoke session:", e.message);
          }
        };
        await revokeSession();
      }
    }
  }
};

const honeypotTrap = (req, res) => {
    auditLog('HONEYPOT_TRIGGERED', null, req, { path: req.path });
    setTimeout(() => {
        res.status(200).json({ status: "success", data: [] });
    }, Math.random() * 2000 + 1000);
};

module.exports = { checkAnomaly, apiLimiter, loginLimiter, exportImportLimiter, heavyLimiter, configureHelmet, getCorsOrigins, auditLog, honeypotTrap };
