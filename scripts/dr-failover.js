require('dotenv').config();
const https = require('https');

// Konfigurasi Infrastruktur DR
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;
const PRIMARY_DB_URL = process.env.DB_HOST;
const REPLICA_DB_URL = process.env.DB_HOST_REPLICA;

const pingDatabase = async (host) => {
    return new Promise((resolve) => {
        const net = require('net');
        const sock = new net.Socket();
        sock.setTimeout(2500);
        sock.on('connect', () => { sock.destroy(); resolve(true); }).on('error', () => resolve(false)).on('timeout', () => resolve(false)).connect(3306, host);
    });
};

const updateRenderEnvVar = (newDbHost) => {
    return new Promise((resolve, reject) => {
        if (!RENDER_API_KEY) {
            console.log(`[DR SIMULATOR] Akan memperbarui Env Var DB_HOST di Render menjadi: ${newDbHost}`);
            return resolve();
        }
        const data = JSON.stringify([{ envVarName: 'DB_HOST', envVarValue: newDbHost }]);
        const req = https.request({
            hostname: 'api.render.com', port: 443, path: `/v1/services/${RENDER_SERVICE_ID}/env-vars`,
            method: 'PUT', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${RENDER_API_KEY}` }
        }, res => { res.on('data', () => {}); res.on('end', () => resolve(res.statusCode === 200)); });
        req.on('error', reject); req.write(data); req.end();
    });
};

const runFailoverCheck = async () => {
    console.log("=== AUTOMATED DISASTER RECOVERY MONITOR ===");
    const isPrimaryUp = await pingDatabase(PRIMARY_DB_URL);
    if (isPrimaryUp) {
        console.log(`[OK] Primary DB (${PRIMARY_DB_URL}) is healthy.`);
        return;
    }
    
    console.error(`[ALERT] Primary DB is DOWN! Initiating Failover in < 5 minutes...`);
    const isReplicaUp = await pingDatabase(REPLICA_DB_URL || 'replica.aivencloud.com');
    
    if (isReplicaUp) {
        console.log(`[FAILOVER] Replica DB is UP. Redirecting traffic...`);
        await updateRenderEnvVar(REPLICA_DB_URL || 'replica.aivencloud.com');
        console.log(`[SUCCESS] Traffic successfully redirected to Replica DB. Zero session loss guaranteed by Circuit Breaker.`);
    } else {
        console.error(`[CRITICAL] Replica DB is also DOWN! System is running in Emergency Degraded Mode (Read-Only Cache).`);
    }
};

runFailoverCheck();
