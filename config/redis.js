const { createClient } = require('redis');

class CacheManager {
    constructor() {
        this.isRedisConnected = false;
        this.memoryCache = new Map();
        
        const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        
        this.client = createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    // Try to reconnect up to 3 times, then give up to avoid hanging
                    if (retries > 3) {
                        console.warn('[REDIS] Max retries reached. Giving up and falling back to Local Memory Mode.');
                        return new Error('Retry exhausted');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        this.client.on('error', (err) => {
            // Suppress continuous error logs after first failure
            if (this.isRedisConnected) {
                console.warn('[REDIS] Client Error:', err.message);
            }
            this.isRedisConnected = false;
        });

        this.client.on('connect', () => {
            console.log('[REDIS] Connected to Redis successfully');
            this.isRedisConnected = true;
        });
    }

    async connect() {
        try {
            await this.client.connect();
        } catch (err) {
            console.warn('[REDIS] Failed to connect initially. Running in Local Memory Mode.');
            this.isRedisConnected = false;
        }
    }

    async setEx(key, seconds, value) {
        if (this.isRedisConnected) {
            try {
                await this.client.setEx(key, seconds, value);
                return;
            } catch (e) { console.error('Redis setEx error:', e); }
        }
        
        // Fallback
        this.memoryCache.set(key, { value, exp: Date.now() + seconds * 1000 });
    }

    async get(key) {
        if (this.isRedisConnected) {
            try {
                return await this.client.get(key);
            } catch (e) { console.error('Redis get error:', e); }
        }
        
        // Fallback
        const data = this.memoryCache.get(key);
        if (!data) return null;
        if (Date.now() > data.exp) {
            this.memoryCache.delete(key);
            return null;
        }
        return data.value;
    }

    async incr(key) {
        if (this.isRedisConnected) {
            try {
                return await this.client.incr(key);
            } catch (e) { console.error('Redis incr error:', e); }
        }

        // Fallback
        const data = this.memoryCache.get(key);
        const val = data && Date.now() < data.exp ? parseInt(data.value, 10) + 1 : 1;
        const exp = data && Date.now() < data.exp ? data.exp : Date.now() + 86400000;
        this.memoryCache.set(key, { value: val.toString(), exp });
        return val;
    }

    async expire(key, seconds) {
        if (this.isRedisConnected) {
            try {
                await this.client.expire(key, seconds);
                return;
            } catch (e) { console.error('Redis expire error:', e); }
        }

        // Fallback
        const data = this.memoryCache.get(key);
        if (data) {
            data.exp = Date.now() + seconds * 1000;
        }
    }

    // Helper function to return the raw Redis Client only if connected.
    // Useful for third-party libraries like `rate-limit-redis`.
    getRawClient() {
        return this.isRedisConnected ? this.client : null;
    }
}

const cacheManager = new CacheManager();
module.exports = cacheManager;
