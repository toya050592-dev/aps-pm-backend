const { mysqlPool } = require('../config/db');
const ExcelJS = require('exceljs');
const crypto = require('crypto');

exports.createTask = async (req, res) => {
  try {
    const { project_id, parent_task_id, task_name, plan_start_date, plan_end_date, plan_hk, status, created_by } = req.body;
    
    const [result] = await mysqlPool.query(
      "INSERT INTO tasks (project_id, parent_task_id, task_name, plan_start_date, plan_end_date, plan_hk, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [project_id, parent_task_id || null, task_name, plan_start_date || null, plan_end_date || null, plan_hk || 1, status || 'Not Started']
    );

    const [rows] = await mysqlPool.query("SELECT * FROM tasks WHERE id = ?", [result.insertId]);
    const task = rows[0];

    const userName = created_by || 'Sistem';
    await mysqlPool.query(
      "INSERT INTO task_history (task_id, user_name, action, created_at) VALUES (?, ?, ?, CURRENT_DATE)",
      [task.id, userName, `Tugas WBS "${task_name}" berhasil dibuat.`]
    );

    res.status(201).json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat membuat tugas WBS");
  }
};

exports.getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const query = `
      SELECT t.*, 
             (
               SELECT CONCAT('[', GROUP_CONCAT(
                   JSON_OBJECT(
                     'id', ta.id, 
                     'user_id', u.id, 
                     'full_name', u.full_name, 
                     'role', u.role
                   )
                 ), ']')
               FROM task_assignees ta
               JOIN users u ON ta.user_id = u.id
               WHERE ta.task_id = t.id
             ) AS assignees
      FROM tasks t
      WHERE t.project_id = ?
      ORDER BY t.id ASC
    `;
    
    const [rows] = await mysqlPool.query(query, [projectId]);
    
    const tasks = rows.map(r => {
      let parsedAssignees = [];
      if (r.assignees) {
        try { parsedAssignees = JSON.parse(r.assignees); } catch (e) {}
      }
      return { ...r, assignees: parsedAssignees };
    });
    
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan pada server saat mengambil tugas");
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { task_name, plan_start_date, plan_end_date, plan_hk, progress_percentage, status, actual_start_date, actual_end_date, actual_hk, notes, updated_by } = req.body;
    
    await mysqlPool.query(
      `UPDATE tasks 
       SET task_name = COALESCE(?, task_name), 
           plan_start_date = COALESCE(?, plan_start_date), 
           plan_end_date = COALESCE(?, plan_end_date), 
           plan_hk = COALESCE(?, plan_hk), 
           progress_percentage = ?, status = ?, actual_start_date = ?, actual_end_date = ?, actual_hk = ?, notes = ? 
       WHERE id = ?`,
      [task_name, plan_start_date, plan_end_date, plan_hk, progress_percentage, status, actual_start_date, actual_end_date, actual_hk, notes, id]
    );

    const userName = updated_by || 'Sistem';
    let logDetails = `Update progres: ${progress_percentage}%, status: ${status}` + (notes ? `, kendala: "${notes}"` : '');
    if (task_name) logDetails = `Update nama tugas / timeline. ` + logDetails;
    
    await mysqlPool.query(
      "INSERT INTO task_history (task_id, user_name, action, created_at) VALUES (?, ?, ?, CURRENT_DATE)",
      [id, userName, logDetails]
    );

    const [rows] = await mysqlPool.query("SELECT * FROM tasks WHERE id = ?", [id]);
    res.json({ message: "Data tugas berhasil diperbarui!", data: rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengupdate WBS");
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [taskRows] = await mysqlPool.query("SELECT task_name FROM tasks WHERE id = ?", [id]);
    const taskName = taskRows[0] ? taskRows[0].task_name : 'Unknown';

    await mysqlPool.query("DELETE FROM task_history WHERE task_id = ?", [id]);
    await mysqlPool.query("DELETE FROM task_assignees WHERE task_id = ?", [id]);
    await mysqlPool.query("DELETE FROM tasks WHERE id = ?", [id]);
    
    res.json({ message: `Tugas WBS "${taskName}" berhasil dihapus.` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat menghapus tugas");
  }
};

exports.importWbs = async (req, res) => {
  const { projectId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });

  let connection;
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];
    
    if (!worksheet) return res.status(400).json({ error: 'File Excel kosong.' });

    connection = await mysqlPool.getConnection();
    await connection.beginTransaction();

    const importedTasks = [];
    const nameToIdMap = new Map();

    const [existingTasks] = await connection.query('SELECT id, task_name FROM tasks WHERE project_id = ?', [projectId]);
    existingTasks.forEach(t => nameToIdMap.set(t.task_name.toLowerCase(), t.id));

    let errorList = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const taskName = row.getCell(1).text?.trim();
      const parentName = row.getCell(2).text?.trim();
      let planStart = row.getCell(3).value;
      let planEnd = row.getCell(4).value;

      if (!taskName) return;

      const formatDate = (dateVal) => {
          if (dateVal instanceof Date) {
              const yyyy = dateVal.getFullYear();
              const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
              const dd = String(dateVal.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
          } else if (typeof dateVal === 'string') {
              const val = dateVal.trim();
              const parts = val.split('/');
              if (parts.length === 3) {
                  const [m, d, y] = parts;
                  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              }
              return val;
          }
          return null;
      };

      planStart = formatDate(planStart);
      planEnd = formatDate(planEnd);

      if (!planStart || !planEnd) {
         errorList.push(`Baris ${rowNumber}: Tanggal Mulai dan Tanggal Selesai harus diisi/valid.`);
         return;
      }

      let parentTaskId = null;
      if (parentName) {
          if (nameToIdMap.has(parentName.toLowerCase())) {
              parentTaskId = nameToIdMap.get(parentName.toLowerCase());
          } else {
              errorList.push(`Baris ${rowNumber}: Induk tugas '${parentName}' tidak ditemukan.`);
              return;
          }
      }

      let planHk = 1;
      try {
          const startD = new Date(planStart);
          const endD = new Date(planEnd);
          let count = 0;
          let cur = new Date(startD);
          while (cur <= endD) {
              const day = cur.getDay();
              if (day !== 0 && day !== 6) count++;
              cur.setDate(cur.getDate() + 1);
          }
          planHk = count > 0 ? count : 1;
      } catch (e) {
          planHk = 1;
      }

      const tempId = crypto.randomUUID(); 
      importedTasks.push({
          id: tempId, project_id: projectId, parent_task_id: parentTaskId,
          task_name: taskName, plan_start_date: planStart, plan_end_date: planEnd,
          plan_hk: planHk, status: 'Not Started'
      });

      nameToIdMap.set(taskName.toLowerCase(), tempId);
    });

    if (errorList.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Validasi gagal pada beberapa baris.', details: errorList });
    }

    let insertedCount = 0;
    const tempIdToDbId = {};

    for (const task of importedTasks) {
        let parentIdToInsert = task.parent_task_id;
        if (parentIdToInsert && tempIdToDbId[parentIdToInsert]) {
            parentIdToInsert = tempIdToDbId[parentIdToInsert];
        }

        const [resTask] = await connection.query(
            "INSERT INTO tasks (project_id, parent_task_id, task_name, plan_start_date, plan_end_date, plan_hk, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [task.project_id, parentIdToInsert, task.task_name, task.plan_start_date, task.plan_end_date, task.plan_hk, task.status]
        );
        const newDbId = resTask.insertId;
        tempIdToDbId[task.id] = newDbId;
        
        insertedCount++;
        await connection.query(
            "INSERT INTO task_history (task_id, user_name, action, created_at) VALUES (?, ?, ?, CURRENT_DATE)",
            [newDbId, 'Sistem (Impor)', `Tugas WBS "${task.task_name}" diimpor dari Excel.`]
        );
    }

    await connection.commit();
    res.json({ message: `Berhasil mengimpor ${insertedCount} tugas.`, count: insertedCount });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error saat impor WBS dari Excel:', err);
    res.status(500).json({ error: 'Terjadi kesalahan internal server saat mengimpor data.' });
  } finally {
    if (connection) connection.release();
  }
};
