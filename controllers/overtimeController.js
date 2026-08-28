const { mysqlPool } = require('../config/db');
const { decryptAES } = require('../utils/crypto');

exports.getOvertime = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT o.*, u.full_name as user_name 
      FROM overtime_requests o 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.id DESC
    `);
    res.json(rows.map(doc => ({ ...doc, kebutuhan: decryptAES(doc.kebutuhan), keterangan: decryptAES(doc.keterangan) })));
  } catch (err) {
    console.error('Error fetching overtime:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

exports.createOvertime = async (req, res) => {
  try {
    const { user_id, department, overtime_date, is_holiday, start_time, end_time, hours, reason } = req.body;
    let evidence_url = null;
    if (req.file) {
      evidence_url = '/uploads/' + req.file.filename;
    }
    
    const [result] = await mysqlPool.query(
      `INSERT INTO overtime_requests (user_id, department, overtime_date, is_holiday, start_time, end_time, hours, reason, evidence_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, department, overtime_date, is_holiday === 'true' || is_holiday === true, start_time, end_time, hours, reason, evidence_url]
    );
    
    const [rows] = await mysqlPool.query("SELECT * FROM overtime_requests WHERE id = ?", [result.insertId]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error creating overtime:', err);
    res.status(500).json({ error: 'Gagal mengajukan lembur.' });
  }
};

exports.approveOvertime = async (req, res) => {
  try {
    const { id } = req.params;
    await mysqlPool.query("UPDATE overtime_requests SET status = 'Approved' WHERE id = ?", [id]);
    
    const [rows] = await mysqlPool.query("SELECT * FROM overtime_requests WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error approving overtime:', err);
    res.status(500).json({ error: 'Gagal menyetujui lembur.' });
  }
};

exports.deleteOvertime = async (req, res) => {
  try {
    const { id } = req.params;
    await mysqlPool.query('DELETE FROM overtime_requests WHERE id = ?', [id]);
    res.json({ message: 'Lembur berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting overtime:', err);
    res.status(500).json({ error: 'Gagal menghapus lembur.' });
  }
};
