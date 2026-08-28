const fs = require("fs");
const content = `

exports.getProjects = async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      "SELECT p.*, u.full_name as pic_name, m.name as product_type_name, m2.name as pic_marketing_name FROM projects p LEFT JOIN users u ON p.pic_user_id = u.id LEFT JOIN master_data m ON p.product_type_id = m.id LEFT JOIN master_data m2 ON p.pic_marketing_id = m2.id ORDER BY p.id ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan pada server");
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, project_value, progress, issues, target_golive, actual_end_date, pic_user_id, baseline_start_date, pic_marketing_id, last_updated_by, product_type_id } = req.body;
    
    await mysqlPool.query(
      "UPDATE projects SET status = COALESCE(?, status), project_value = COALESCE(?, project_value), progress = COALESCE(?, progress), issues = COALESCE(?, issues), baseline_end_date = COALESCE(?, baseline_end_date), actual_end_date = COALESCE(?, actual_end_date), pic_user_id = COALESCE(?, pic_user_id), baseline_start_date = COALESCE(?, baseline_start_date), pic_marketing_id = COALESCE(?, pic_marketing_id), last_updated_by = COALESCE(?, last_updated_by), product_type_id = COALESCE(?, product_type_id) WHERE id = ?",
      [status, project_value, progress, issues, target_golive, actual_end_date, pic_user_id, baseline_start_date, pic_marketing_id, last_updated_by, product_type_id, id]
    );
    
    const [rows] = await mysqlPool.query("SELECT * FROM projects WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat update status");
  }
};

exports.deleteProject = async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysqlPool.getConnection();
    await connection.beginTransaction();
    
    // Delete history associated with tasks of this project
    await connection.query("DELETE FROM task_history WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)", [id]);
    
    // Delete assignees associated with tasks of this project
    await connection.query("DELETE FROM task_assignees WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)", [id]);
    
    // Delete tasks associated with this project
    await connection.query("DELETE FROM tasks WHERE project_id = ?", [id]);
    
    // Delete the project itself
    await connection.query("DELETE FROM projects WHERE id = ?", [id]);
    
    await connection.commit();
    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err.message);
    res.status(500).send("Server Error");
  } finally {
    if (connection) connection.release();
  }
};
`;
fs.appendFileSync("controllers/projectController.js", content);
