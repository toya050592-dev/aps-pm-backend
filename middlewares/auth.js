const { jtsAuth } = require('@engjts/auth');
const { getResourceServer, getAuthServer } = require('../config/jts');
const { mysqlPool } = require('../config/db');

// Gunakan jtsAuth dari library untuk memvalidasi token secara kriptografis (Stateless)
// Namun kita bungkus untuk menambahkan pengecekan StateProof / Database
const authenticateToken = async (req, res, next) => {
    try {
        const resourceServer = getResourceServer();
        const authServer = getAuthServer();

        // Ambil header
        const authHeader = req.headers['authorization'];
        const bearerPass = authHeader && authHeader.split(' ')[1];
        
        if (!bearerPass) {
            return res.status(401).json({ message: 'Akses ditolak: Token tidak ditemukan' });
        }

        // 1. Verifikasi Signature BearerPass (Stateless)
        const result = await resourceServer.verify(bearerPass);
        if (!result.valid) {
            return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa.' });
        }

        const prn = result.payload.prn; // User ID
        const aid = result.payload.aid; // Session ID (Anchor ID)

        // 2. Verifikasi Sesi di AuthServer (Revocation Check)
        const session = await authServer.getSession(aid);
        if (!session) {
            return res.status(401).json({ message: 'Sesi telah dicabut atau kadaluarsa.' });
        }

        // 3. Verifikasi is_active di Database
        const [rows] = await mysqlPool.query("SELECT is_active FROM users WHERE id = ?", [prn]);
        if (rows.length === 0) return res.status(401).json({ message: 'User tidak ditemukan' });
        if (!rows[0].is_active) return res.status(403).json({ message: 'Akun Anda telah dinonaktifkan oleh Admin.' });

        // Mapping payload kembali ke req.user agar kompatibel dengan controller lama
        req.user = result.payload;
        // JTS payload structure contains: prn (id), role, username dll dari login()

        next();
    } catch (error) {
        console.error('[JTS Auth Error]', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada validasi sesi server.' });
    }
};

const authorizeAdmin = (req, res, next) => {
    authenticateToken(req, res, () => {
        // Asumsi payload JTS menyimpan role
        if (req.user && req.user.role === 'Admin') {
            next();
        } else {
            res.status(403).json({ message: 'Akses ditolak: Hanya untuk Admin' });
        }
    });
};

module.exports = { authenticateToken, authorizeAdmin };
