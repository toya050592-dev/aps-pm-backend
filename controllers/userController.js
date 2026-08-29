const { mysqlPool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { encryptAES, decryptAES } = require('../utils/crypto');
const { auditLog } = require('../middlewares/security');

const SAFE_USER_FIELDS = 'id, full_name, role, username, is_active, permissions, nik, jabatan';

function isPasswordStrong(password) {
  if (!password || password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

exports.createUser = async (req, res) => {
  try {
    const { full_name, role, username, password, permissions, nik, jabatan } = req.body;

    if (password && !isPasswordStrong(password)) {
      return res.status(400).json({ message: "Password minimal 8 karakter dan harus mengandung kombinasi huruf serta angka." });
    }

    const password_hash = password ? await bcrypt.hash(password, 10) : null;
    const perms = JSON.stringify(permissions && permissions.length ? permissions : ['summary', 'dashboard']);

    const [result] = await mysqlPool.query(
      `INSERT INTO users (full_name, role, username, password_hash, permissions, nik, jabatan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name, role, username || null, password_hash, perms, encryptAES(nik) || null, jabatan || null]
    );

    const [rows] = await mysqlPool.query(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`, [result.insertId]);
    const newUser = rows[0];

    auditLog('USER_CREATED', req.user.id, req, { new_user_id: newUser.id, role, username });
    res.json(newUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan pada server. Pastikan username belum dipakai orang lain.");
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`SELECT ${SAFE_USER_FIELDS} FROM users ORDER BY full_name ASC`);
    const users = rows.map(u => ({ ...u, nik: decryptAES(u.nik) }));
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan pada server");
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, permissions, username, nik, jabatan } = req.body;
    const perms = JSON.stringify(permissions || []);
    
    await mysqlPool.query(
      `UPDATE users SET full_name = ?, role = ?, permissions = ?, username = ?, nik = ?, jabatan = ? WHERE id = ?`,
      [full_name, role, perms, username || null, encryptAES(nik) || null, jabatan || null, id]
    );

    const [rows] = await mysqlPool.query(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`, [id]);
    
    auditLog('USER_UPDATED', req.user.id, req, { target_user_id: id, new_role: role, full_name, username });
    res.json({ message: "Data anggota tim berhasil diperbarui.", data: rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan. Pastikan ID Login (Username) belum dipakai orang lain.");
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await mysqlPool.query("UPDATE users SET is_active = ? WHERE id = ?", [is_active, id]);

    const [rows] = await mysqlPool.query(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`, [id]);
    
    auditLog('USER_STATUS_CHANGED', req.user.id, req, { target_user_id: id, is_active });
    res.json({ message: "Status anggota tim berhasil diperbarui.", data: rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengubah status user");
  }
};

exports.updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!isPasswordStrong(password)) {
      return res.status(400).json({ message: "Password minimal 8 karakter dan harus mengandung kombinasi huruf serta angka." });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await mysqlPool.query("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, id]);
    res.json({ message: "Password berhasil diperbarui." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengubah password");
  }
};
