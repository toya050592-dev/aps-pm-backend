const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

const targetRegex = /app\.put\('\/api\/users\/:id\/status'[\s\S]*?\/\/ --- LOGIN & AUTH ---/;

const replacementContent = `app.put('/api/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const updated = await pool.query(
      \`UPDATE users SET is_active = $1 WHERE id = $2 RETURNING \${SAFE_USER_FIELDS}\`,
      [is_active, id]
    );
    res.json({ message: "Status anggota tim berhasil diperbarui.", data: updated.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengubah status user");
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!isPasswordStrong(password)) {
      return res.status(400).json({ message: "Password minimal 8 karakter dan harus mengandung kombinasi huruf serta angka." });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, id]);
    res.json({ message: "Password berhasil diperbarui." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengubah password");
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, project_value, progress, issues, target_golive, actual_end_date, pic_user_id } = req.body;
    const updateProject = await pool.query(
      "UPDATE projects SET status = COALESCE($1, status), project_value = COALESCE($2, project_value), progress = COALESCE($3, progress), issues = COALESCE($4, issues), baseline_end_date = COALESCE($5, baseline_end_date), actual_end_date = COALESCE($6, actual_end_date), pic_user_id = COALESCE($7, pic_user_id) WHERE id = $8 RETURNING *",
      [status, project_value, progress, issues, target_golive, actual_end_date, pic_user_id, id]
    );
    res.json(updateProject.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat update status");
  }
});

// --- MASTER DATA ---
app.get('/api/master-data', async (req, res) => {
  try {
    const { type } = req.query;
    let query = "SELECT * FROM master_data ORDER BY id ASC";
    let params = [];
    if (type) {
      query = "SELECT * FROM master_data WHERE type = $1 ORDER BY id ASC";
      params = [type];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengambil master data");
  }
});

app.post('/api/master-data', async (req, res) => {
  try {
    const { type, name } = req.body;
    const result = await pool.query(
      "INSERT INTO master_data (type, name) VALUES ($1, $2) RETURNING *",
      [type, name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat menambah master data");
  }
});

app.put('/api/master-data/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const result = await pool.query(
      "UPDATE master_data SET is_active = $1 WHERE id = $2 RETURNING *",
      [is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat mengupdate status master data");
  }
});

// --- LOGIN & AUTH ---`;

content = content.replace(targetRegex, replacementContent);
fs.writeFileSync('server.js', content);
console.log("Replaced users/master-data/projects section.");
