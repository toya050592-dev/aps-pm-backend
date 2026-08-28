const fs = require('fs');
const path = require('path');
const { JTSAuthServer, JTSResourceServer, generateKeyPair, InMemorySessionStore } = require('@engjts/auth');

const KEY_PATH = path.join(__dirname, '..', 'jts.key.json');
let authServer = null;
let resourceServer = null;

const initJTS = async () => {
    let signingKey;
    if (fs.existsSync(KEY_PATH)) {
        console.log('[JTS] Memuat kunci penandatanganan dari jts.key.json...');
        signingKey = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
    } else {
        console.log('[JTS] Membuat kunci penandatanganan (RSA) baru...');
        signingKey = await generateKeyPair('jts-key-aps-pm-v1', 'RS256');
        fs.writeFileSync(KEY_PATH, JSON.stringify(signingKey, null, 2));
    }

    // Initialize Auth Server
    authServer = new JTSAuthServer({
        profile: 'JTS-S/v1',
        signingKey,
        bearerPassLifetime: 60 * 40, // 40 minutes (matches previous JWT)
        stateProofLifetime: 60 * 60 * 24 * 7, // 7 days
        sessionStore: new InMemorySessionStore() 
    });

    // Initialize Resource Server
    resourceServer = new JTSResourceServer({
        publicKeys: [signingKey],
        audience: 'aps-pm-api'
    });

    console.log('[JTS] Janus Token System berhasil diinisialisasi.');
};

const getAuthServer = () => {
    if (!authServer) throw new Error("JTS Auth Server belum diinisialisasi!");
    return authServer;
};

const getResourceServer = () => {
    if (!resourceServer) throw new Error("JTS Resource Server belum diinisialisasi!");
    return resourceServer;
};

module.exports = {
    initJTS,
    getAuthServer,
    getResourceServer
};
