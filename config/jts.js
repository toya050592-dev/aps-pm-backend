const fs = require("fs");
const path = require("path");
const { JTSAuthServer, JTSResourceServer, generateKeyPair, BaseSessionStore } = require("@engjts/auth");
const { mysqlPool } = require("./db");

class MySQLSessionStore extends BaseSessionStore {
    constructor(pool) {
        super();
        this.pool = pool;
    }
    
    async init() {
        await this.pool.query(
            "CREATE TABLE IF NOT EXISTS jts_sessions (" +
                "aid VARCHAR(128) PRIMARY KEY, " +
                "prn VARCHAR(255), " +
                "current_state_proof VARCHAR(128), " +
                "expires_at DATETIME, " +
                "session_data JSON" +
            ")"
        );
        console.log("[JTS] MySQL Session Store tabel berhasil dicek/dibuat.");
    }

    async createSession(sessionData) {
        const expiresAt = new Date(sessionData.expiresAt);
        await this.pool.query(
            "INSERT INTO jts_sessions (aid, prn, current_state_proof, expires_at, session_data) VALUES (?, ?, ?, ?, ?)",
            [sessionData.aid, sessionData.prn, sessionData.currentStateProof, expiresAt, JSON.stringify(sessionData)]
        );
        return sessionData;
    }

    async getSessionByAid(aid) {
        const [rows] = await this.pool.query("SELECT session_data FROM jts_sessions WHERE aid = ? AND expires_at > NOW()", [aid]);
        if (rows.length === 0) return null;
        return this._parse(rows[0].session_data);
    }

    async getSessionByStateProof(stateProof) {
        const [rows] = await this.pool.query("SELECT session_data FROM jts_sessions WHERE current_state_proof = ? AND expires_at > NOW()", [stateProof]);
        if (rows.length === 0) return null;
        return this._parse(rows[0].session_data);
    }

    async rotateStateProof(aid, newStateProof, options = {}) {
        const session = await this.getSessionByAid(aid);
        if (!session) return false;
        
        session.previousStateProof = session.currentStateProof;
        session.currentStateProof = newStateProof;
        session.stateProofVersion += 1;
        session.rotationTimestamp = new Date();
        
        await this.pool.query(
            "UPDATE jts_sessions SET current_state_proof = ?, session_data = ? WHERE aid = ?",
            [newStateProof, JSON.stringify(session), aid]
        );
        return true;
    }

    async touchSession(aid, newExpiresAt) {
        const session = await this.getSessionByAid(aid);
        if (!session) return false;
        
        session.expiresAt = newExpiresAt;
        session.lastActive = new Date();
        
        await this.pool.query(
            "UPDATE jts_sessions SET expires_at = ?, session_data = ? WHERE aid = ?",
            [new Date(newExpiresAt), JSON.stringify(session), aid]
        );
        return true;
    }

    async deleteSession(aid) {
        const [result] = await this.pool.query("DELETE FROM jts_sessions WHERE aid = ?", [aid]);
        return result.affectedRows > 0;
    }

    async deleteAllSessionsForPrincipal(prn) {
        const [result] = await this.pool.query("DELETE FROM jts_sessions WHERE prn = ?", [prn]);
        return result.affectedRows;
    }

    async getSessionsForPrincipal(prn) {
        const [rows] = await this.pool.query("SELECT session_data FROM jts_sessions WHERE prn = ? AND expires_at > NOW()", [prn]);
        return rows.map(r => this._parse(r.session_data));
    }

    async cleanupExpiredSessions() {
        const [result] = await this.pool.query("DELETE FROM jts_sessions WHERE expires_at <= NOW()");
        return result.affectedRows;
    }

    _parse(data) {
        const s = typeof data === "string" ? JSON.parse(data) : data;
        if (s.createdAt) s.createdAt = new Date(s.createdAt);
        if (s.expiresAt) s.expiresAt = new Date(s.expiresAt);
        if (s.lastActive) s.lastActive = new Date(s.lastActive);
        if (s.rotationTimestamp) s.rotationTimestamp = new Date(s.rotationTimestamp);
        return s;
    }
}

const KEY_PATH = path.join(__dirname, "..", "jts.key.json");
let authServer = null;
let resourceServer = null;

const initJTS = async () => {
    let signingKey;
    if (fs.existsSync(KEY_PATH)) {
        console.log("[JTS] Memuat kunci penandatanganan dari jts.key.json...");
        signingKey = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
    } else {
        console.log("[JTS] Membuat kunci penandatanganan (RSA) baru...");
        signingKey = await generateKeyPair("jts-key-aps-pm-v1", "RS256");
        fs.writeFileSync(KEY_PATH, JSON.stringify(signingKey, null, 2));
    }

    const sessionStore = new MySQLSessionStore(mysqlPool);
    await sessionStore.init();

    // Initialize Auth Server
    authServer = new JTSAuthServer({
        profile: "JTS-S/v1",
        signingKey,
        bearerPassLifetime: 60 * 40, // 40 minutes (matches previous JWT)
        stateProofLifetime: 60 * 60 * 24 * 7, // 7 days
        sessionStore,
        audience: "aps-pm-api"
    });

    // Initialize Resource Server
    resourceServer = new JTSResourceServer({
        publicKeys: [signingKey],
        audience: "aps-pm-api"
    });

    console.log("[JTS] Janus Token System berhasil diinisialisasi dengan MySQL Session Store.");
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
