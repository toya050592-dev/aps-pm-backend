const { mysqlPool } = require('../config/db');
const { decryptAES } = require('../utils/crypto');

exports.getDocumentTracking = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
      SELECT dt.*, md.name AS vendor_name 
      FROM document_tracking dt 
      LEFT JOIN master_data md ON dt.vendor_id = md.id 
      ORDER BY dt.id DESC
    `);
    res.json(rows.map(doc => ({ ...doc, kebutuhan: decryptAES(doc.kebutuhan), keterangan: decryptAES(doc.keterangan) })));
  } catch (err) {
    console.error('Error fetching document tracking:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
};

exports.getHandovers = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(`
        SELECT h.*, 
               s.full_name as sender_name, 
               r.full_name as receiver_name,
               dt.no_pengajuan
        FROM document_handovers h
        LEFT JOIN users s ON h.sender_id = s.id
        LEFT JOIN users r ON h.receiver_id = r.id
        LEFT JOIN document_tracking dt ON h.document_id = dt.id
        ORDER BY h.tanggal_diberikan DESC
    `);
    res.json(rows.map(doc => ({ ...doc, kebutuhan: decryptAES(doc.kebutuhan), keterangan: decryptAES(doc.keterangan) })));
  } catch (err) {
    console.error('Error fetching handovers:', err);
    res.status(500).json({ error: 'Gagal mengambil data serah terima.' });
  }
};

exports.getHandoversByDocument = async (req, res) => {
  try {
    const { document_id } = req.params;
    const [rows] = await mysqlPool.query(`
        SELECT h.*, 
               s.full_name as sender_name, 
               r.full_name as receiver_name 
        FROM document_handovers h
        LEFT JOIN users s ON h.sender_id = s.id
        LEFT JOIN users r ON h.receiver_id = r.id
        WHERE h.document_id = ?
        ORDER BY h.tanggal_diberikan DESC
    `, [document_id]);
    res.json(rows.map(doc => ({ ...doc, kebutuhan: decryptAES(doc.kebutuhan), keterangan: decryptAES(doc.keterangan) })));
  } catch (err) {
    console.error('Error fetching handovers:', err);
    res.status(500).json({ error: 'Gagal mengambil riwayat serah terima.' });
  }
};

exports.createHandover = async (req, res) => {
  try {
    const { document_id, sender_id, receiver_id, nama_dokumen, catatan } = req.body;
    if (!sender_id || !receiver_id) return res.status(400).json({ error: 'Pengirim dan Penerima tidak boleh kosong.' });
    if (String(sender_id) === String(receiver_id)) return res.status(400).json({ error: 'Pengirim dan Penerima tidak boleh sama.' });

    const [result] = await mysqlPool.query(
        `INSERT INTO document_handovers (document_id, sender_id, receiver_id, nama_dokumen, catatan, status)
         VALUES (?, ?, ?, ?, ?, 'DIBERIKAN')`,
        [document_id, sender_id, receiver_id, nama_dokumen, catatan || null]
    );

    const [rows] = await mysqlPool.query("SELECT * FROM document_handovers WHERE id = ?", [result.insertId]);
    res.json({ message: 'Serah terima berhasil dicatat.', data: rows[0] });
  } catch (err) {
    console.error('Error creating handover:', err);
    res.status(500).json({ error: 'Gagal mencatat serah terima.' });
  }
};

exports.receiveHandover = async (req, res) => {
  try {
    const { id } = req.params;
    await mysqlPool.query(
        `UPDATE document_handovers 
         SET status = 'DITERIMA', tanggal_diterima = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );
    
    const [rows] = await mysqlPool.query("SELECT * FROM document_handovers WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Data serah terima tidak ditemukan.' });
    
    res.json({ message: 'Dokumen berhasil dikonfirmasi diterima.', data: rows[0] });
  } catch (err) {
    console.error('Error receiving handover:', err);
    res.status(500).json({ error: 'Gagal mengonfirmasi serah terima.' });
  }
};
