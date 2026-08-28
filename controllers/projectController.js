const { mysqlPool } = require('../config/db');
const ExcelJS = require('exceljs');

exports.createProject = async (req, res) => {
  try {
    const { project_name, status, baseline_start_date, baseline_end_date, pic_user_id, product_type_id, project_value, progress, issues, pic_marketing_id } = req.body;
    
    // MySQL uses ? for parameter binding
    const [result] = await mysqlPool.query(
        "INSERT INTO projects (project_name, status, baseline_start_date, baseline_end_date, pic_user_id, product_type_id, project_value, progress, issues, pic_marketing_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [project_name, status, baseline_start_date, baseline_end_date, pic_user_id || null, product_type_id || null, project_value || 0, progress || '', issues || '', pic_marketing_id || null]
    );

    // Fetch the newly inserted record via insertId
    const [rows] = await mysqlPool.query("SELECT * FROM projects WHERE id = ?", [result.insertId]);
    const newProject = rows[0];

    req.io.emit('new_project', newProject);
    res.status(201).json(newProject);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat membuat proyek");
  }
};

exports.importProjects = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File Excel tidak ditemukan" });

  let connection;
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet(1); // Read first sheet
    
    if (!sheet) return res.status(400).json({ error: "Sheet tidak ditemukan" });

    // 1. ACQUIRE CONNECTION & START TRANSACTION
    connection = await mysqlPool.getConnection();
    await connection.beginTransaction();

    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    
    // Fetch master data for memory mapping (using the transaction connection)
    const [usersRes] = await connection.query("SELECT id, full_name FROM users WHERE is_active = true");
    const userMap = {};
    usersRes.forEach(u => userMap[u.full_name] = u.id);

    const [productsRes] = await connection.query("SELECT id, name FROM master_data WHERE type = 'JENIS_PRODUK' AND is_active = true");
    const productMap = {};
    productsRes.forEach(p => productMap[p.name] = p.id);

    const [marketingRes] = await connection.query("SELECT id, name FROM master_data WHERE type = 'MARKETING' AND is_active = true");
    const marketingMap = {};
    marketingRes.forEach(p => marketingMap[p.name] = p.id);

    // Prepare queries synchronously
    const queries = [];
    
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const projectName = row.getCell(1).text?.trim();
      const picName = row.getCell(2).text?.trim();
      const productName = row.getCell(3).text?.trim();
      const marketingName = row.getCell(4).text?.trim();
      
      let startDateStr = null;
      const startDateRaw = row.getCell(5).value;
      if (startDateRaw) {
         if (startDateRaw instanceof Date) {
             startDateStr = new Date(startDateRaw.getTime() - startDateRaw.getTimezoneOffset() * 60000).toISOString().split('T')[0];
         } else {
             startDateStr = startDateRaw; // Assumes string format if not actual Date
         }
      }

      const projectValueRaw = row.getCell(6).value;
      
      let projectValue = 0;
      if (projectValueRaw !== undefined && projectValueRaw !== null) {
         projectValue = Number(String(projectValueRaw).replace(/,/g, ''));
      }

      if (!projectName) { errors.push({ row: rowNumber, name: projectName || '-', error: "Nama Project wajib diisi." }); failedCount++; return; }
      if (!picName || !userMap[picName]) { errors.push({ row: rowNumber, name: projectName, error: `PIC Project "${picName}" tidak valid atau tidak terdaftar.` }); failedCount++; return; }
      if (!productName || !productMap[productName]) { errors.push({ row: rowNumber, name: projectName, error: `Jenis Produk "${productName}" tidak valid atau tidak terdaftar.` }); failedCount++; return; }
      if (marketingName && !marketingMap[marketingName]) { errors.push({ row: rowNumber, name: projectName, error: `PIC Marketing "${marketingName}" tidak valid atau tidak terdaftar.` }); failedCount++; return; }
      if (isNaN(projectValue)) { errors.push({ row: rowNumber, name: projectName, error: `Nilai Project format tidak valid (harus angka).` }); failedCount++; return; }

      // Valid data, queue insert
      const picId = userMap[picName];
      const prodId = productMap[productName];
      const markId = marketingName ? marketingMap[marketingName] : null;
      
      queries.push({
        sql: "INSERT INTO projects (project_name, status, pic_user_id, product_type_id, pic_marketing_id, baseline_start_date, project_value) VALUES (?, 'Not Started', ?, ?, ?, ?, ?)",
        values: [projectName, picId, prodId, markId, startDateStr, projectValue],
        rowNumber, projectName
      });
    });

    // 2. EXECUTE QUERIES SEQUENTIALLY IN TRANSACTION
    for (const q of queries) {
      try {
        await connection.query(q.sql, q.values);
        successCount++;
      } catch (err) {
        errors.push({ row: q.rowNumber, name: q.projectName, error: "Gagal menyimpan ke database: " + err.message });
        failedCount++;
      }
    }

    // 3. COMMIT OR ROLLBACK (Strict Transaction Model)
    // If we want all-or-nothing (to prevent corrupted/partial imports):
    if (errors.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: "Import dibatalkan seluruhnya karena ditemukan baris yang error.", 
        failedCount, 
        errors 
      });
    }

    await connection.commit();
    res.json({ successCount, failedCount, errors });
    
  } catch (err) {
    // Failsafe Rollback on critical errors
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: "Gagal memproses file Excel." });
  } finally {
    // 4. ALWAYS RELEASE CONNECTION BACK TO POOL
    if (connection) connection.release();
  }
};
