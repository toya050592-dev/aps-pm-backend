const { mysqlPool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { auditLog } = require('../middlewares/security');
const { getAuthServer } = require('../config/jts');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await mysqlPool.query("SELECT * FROM users WHERE username = ?", [username]);
    const user = rows[0];

    if (!user) {
      auditLog('LOGIN_FAILED', null, req, { username, reason: 'Username tidak ditemukan' });
      return res.status(401).json({ message: "Username tidak ditemukan." });
    }
    if (!user.is_active) {
      auditLog('LOGIN_FAILED', user.id, req, { username, reason: 'Akun dinonaktifkan' });
      return res.status(401).json({ message: "Akun ini sudah dinonaktifkan." });
    }
    if (!user.password_hash) {
      auditLog('LOGIN_FAILED', user.id, req, { username, reason: 'Password kosong' });
      return res.status(401).json({ message: "Akun ini belum memiliki password. Hubungi Admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      auditLog('LOGIN_FAILED', user.id, req, { username, reason: 'Password salah' });
      return res.status(401).json({ message: "Password salah." });
    }

    // Mendapatkan instance JTS Auth Server
    const authServer = getAuthServer();

    const permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : (user.permissions || []);
    
    // Login user ke JTS (menerbitkan BearerPass dan StateProof)
    // payload harus string
    const tokens = await authServer.login({
      prn: user.id.toString(),
      // Custom payload
      role: user.role,
      full_name: user.full_name,
      username: user.username,
      permissions: permissions
    });

    const safeUser = {
      id: user.id, 
      full_name: user.full_name, 
      role: user.role,
      username: user.username, 
      permissions: permissions,
    };

    auditLog('LOGIN_SUCCESS', user.id, req, { username, role: user.role });
    
    // Memberikan response dengan format JTS
    res.json({ 
        message: "Login berhasil!", 
        jts: tokens, // { bearerPass, stateProof, expiresIn }
        user: safeUser 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi kesalahan saat login");
  }
};

exports.logout = async (req, res) => {
  try {
    const authServer = getAuthServer();
    if (req.user && req.user.aid) {
      // Cabut sesi secara instan dari memory store JTS
      await authServer.revokeSession(req.user.aid);
    }
    res.json({ message: 'Logout berhasil, sesi JTS dihapus.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Kesalahan saat logout' });
  }
};

exports.checkAuth = (req, res) => {
  res.json({ valid: true, user: req.user });
};
