const { mysqlPool } = require('../config/db');
const { decryptAES } = require('../utils/crypto');

exports.getOnsiteSchedules = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query("SELECT * FROM onsite_schedules WHERE status != 'Selesai' ORDER BY id ASC");
    res.json(rows.map(doc => ({ ...doc, kebutuhan: decryptAES(doc.kebutuhan), keterangan: decryptAES(doc.keterangan) })));
  } catch (err) {
    console.error('Error fetching onsite schedules:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

exports.createOnsiteSchedule = async (req, res) => {
  try {
    const { pic_names, role, location, status, start_date, end_date, health } = req.body;
    const [result] = await mysqlPool.query(
      `INSERT INTO onsite_schedules (pic_names, role, location, status, start_date, end_date, health) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [JSON.stringify(pic_names), role, location, status, start_date, end_date, health]
    );
    const [rows] = await mysqlPool.query("SELECT * FROM onsite_schedules WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating onsite schedule:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

exports.updateOnsiteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { pic_names, role, location, status, start_date, end_date, health } = req.body;
    await mysqlPool.query(
      `UPDATE onsite_schedules 
       SET pic_names = ?, role = ?, location = ?, status = ?, start_date = ?, end_date = ?, health = ? 
       WHERE id = ?`,
      [JSON.stringify(pic_names), role, location, status, start_date, end_date, health, id]
    );
    const [rows] = await mysqlPool.query("SELECT * FROM onsite_schedules WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating onsite schedule:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

exports.deleteOnsiteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await mysqlPool.query('DELETE FROM onsite_schedules WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
    res.json({ message: 'Jadwal berhasil dihapus.' });
  } catch (err) {
    console.error('Error deleting onsite schedule:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};
