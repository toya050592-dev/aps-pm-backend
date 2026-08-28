const { mysqlPool } = require('../config/db');
const { decryptAES } = require('../utils/crypto');

exports.getMasterData = async (req, res) => {
  try {
    const { type } = req.query;
    let query = "SELECT * FROM master_data ORDER BY id ASC";
    let params = [];
    
    if (type) {
      query = "SELECT * FROM master_data WHERE type = ? ORDER BY id ASC";
      params = [type];
    }
    
    const [rows] = await mysqlPool.query(query, params);
    res.json(rows.map(doc => ({ ...doc, kebutuhan: decryptAES(doc.kebutuhan), keterangan: decryptAES(doc.keterangan) })));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengambil master data");
  }
};

exports.createMasterData = async (req, res) => {
  try {
    const { type, name } = req.body;
    const [result] = await mysqlPool.query(
      "INSERT INTO master_data (type, name) VALUES (?, ?)",
      [type, name]
    );
    
    const [rows] = await mysqlPool.query("SELECT * FROM master_data WHERE id = ?", [result.insertId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat menambah master data");
  }
};

exports.updateMasterDataStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    await mysqlPool.query("UPDATE master_data SET is_active = ? WHERE id = ?", [is_active, id]);
    
    const [rows] = await mysqlPool.query("SELECT * FROM master_data WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengupdate status master data");
  }
};

exports.updateMasterData = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Check if it's a ROLE and fetch old name
    const [oldDataRes] = await mysqlPool.query("SELECT * FROM master_data WHERE id = ?", [id]);
    const oldData = oldDataRes[0];
    
    await mysqlPool.query("UPDATE master_data SET name = ? WHERE id = ?", [name, id]);

    // If a ROLE name is updated, cascade the change to the users table
    if (oldData && oldData.type === 'ROLE' && oldData.name !== name) {
      await mysqlPool.query("UPDATE users SET role = ? WHERE role = ?", [name, oldData.name]);
    }

    const [rows] = await mysqlPool.query("SELECT * FROM master_data WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengupdate master data");
  }
};
