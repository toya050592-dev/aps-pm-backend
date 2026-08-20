const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const regex = /\/\/ --- PROJECTS ---\r?\napp\.post\('\/api\/projects', async \(req, res\) => \{\r?\n  try \{\r?\n    const \{ project_name[\s\S]*?\/\/ All Projects list for dashboard table/m;

const replacement = `// --- PROJECTS ---
app.post('/api/projects', async (req, res) => {
  try {
    const { project_name, status, baseline_start_date, baseline_end_date, pic_user_id, product_type_id, project_value, progress, issues } = req.body;
    const newProject = await pool.query(
      "INSERT INTO projects (project_name, status, baseline_start_date, baseline_end_date, pic_user_id, product_type_id, project_value, progress, issues) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [project_name, status, baseline_start_date, baseline_end_date, pic_user_id || null, product_type_id || null, project_value || 0, progress || '', issues || '']
    );
    res.json(newProject.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Terjadi kesalahan saat membuat proyek");
  }
});

// ---------- DASHBOARD STATS ----------
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    let pFilter = "";
    let tFilter = "";

    if (period === 'custom' && startDate && endDate) {
      // Basic validation
      const dateRegex = /^\\d{4}-\\d{2}-\\d{2}$/;
      if (dateRegex.test(startDate) && dateRegex.test(endDate)) {
        pFilter = \` AND COALESCE(actual_end_date, baseline_end_date, created_at) >= '\${startDate}' AND COALESCE(actual_end_date, baseline_end_date, created_at) <= '\${endDate}'\`;
        tFilter = \` AND COALESCE(plan_end_date, CURRENT_DATE) >= '\${startDate}' AND COALESCE(plan_end_date, CURRENT_DATE) <= '\${endDate}'\`;
      }
    } else if (period === 'this_month') {
      pFilter = " AND EXTRACT(MONTH FROM COALESCE(actual_end_date, baseline_end_date, created_at)) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM COALESCE(actual_end_date, baseline_end_date, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)";
      tFilter = " AND EXTRACT(MONTH FROM COALESCE(plan_end_date, CURRENT_DATE)) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM COALESCE(plan_end_date, CURRENT_DATE)) = EXTRACT(YEAR FROM CURRENT_DATE)";
    } else if (period === 'last_month') {
      pFilter = " AND EXTRACT(MONTH FROM COALESCE(actual_end_date, baseline_end_date, created_at)) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL 1 MONTH) AND EXTRACT(YEAR FROM COALESCE(actual_end_date, baseline_end_date, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL 1 MONTH)";
      tFilter = " AND EXTRACT(MONTH FROM COALESCE(plan_end_date, CURRENT_DATE)) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL 1 MONTH) AND EXTRACT(YEAR FROM COALESCE(plan_end_date, CURRENT_DATE)) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL 1 MONTH)";
    } else if (period === 'this_year') {
      pFilter = " AND EXTRACT(YEAR FROM COALESCE(actual_end_date, baseline_end_date, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)";
      tFilter = " AND EXTRACT(YEAR FROM COALESCE(plan_end_date, CURRENT_DATE)) = EXTRACT(YEAR FROM CURRENT_DATE)";
    }

    // Basic Counts
    const projectCountRes = await pool.query(\`SELECT COUNT(*) as count FROM projects WHERE 1=1 \${pFilter}\`);
    const totalProjects = parseInt(projectCountRes.rows[0].count, 10);

    const taskCountRes = await pool.query(\`SELECT COUNT(*) as count FROM tasks WHERE 1=1 \${tFilter}\`);
    const totalTasks = parseInt(taskCountRes.rows[0].count, 10);

    const completedTaskRes = await pool.query(\`SELECT COUNT(*) as count FROM tasks WHERE status = 'Selesai' \${tFilter}\`);
    const completedTasks = parseInt(completedTaskRes.rows[0].count, 10);

    const delayedTaskRes = await pool.query(\`SELECT COUNT(*) as count FROM tasks WHERE status != 'Selesai' AND plan_end_date < CURRENT_DATE \${tFilter}\`);
    const delayedTasks = parseInt(delayedTaskRes.rows[0].count, 10);

    const openIssueRes = await pool.query(\`SELECT COUNT(*) as count FROM projects WHERE issues IS NOT NULL AND issues != '' AND issues != '-' \${pFilter}\`);
    const openIssues = parseInt(openIssueRes.rows[0].count, 10);

    // Revenue
    const revenueRes = await pool.query(\`SELECT SUM(project_value) as total_nilai FROM projects WHERE 1=1 \${pFilter}\`);
    const totalNilai = parseInt(revenueRes.rows[0].total_nilai || 0, 10);

    const realisasiRes = await pool.query(\`SELECT SUM(project_value) as total_realisasi FROM projects WHERE status = 'Go Live' \${pFilter}\`);
    const totalRealisasi = parseInt(realisasiRes.rows[0].total_realisasi || 0, 10);

    // Status Breakdown (Projects)
    const statusBreakdownRes = await pool.query(\`SELECT status, COUNT(*) as count, SUM(project_value) as total_value FROM projects WHERE 1=1 \${pFilter} GROUP BY status\`);
    
    // Upcoming Milestones (Tasks ending soon)
    const upcomingTasksRes = await pool.query(\`
      SELECT t.task_name, t.plan_end_date as end_date, p.project_name 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id 
      WHERE t.status != 'Selesai' AND t.plan_end_date >= CURRENT_DATE \${tFilter}
      ORDER BY t.plan_end_date ASC LIMIT 5
    \`);

    // Proyek Perlu Perhatian (Projects with issues or on hold)
    const attentionProjectsRes = await pool.query(\`
      SELECT id, project_name, status, issues, baseline_end_date 
      FROM projects 
      WHERE ((issues IS NOT NULL AND issues != '' AND issues != '-') 
         OR status = 'On Hold') \${pFilter}
      LIMIT 5
    \`);

    // Top 5 Projects by Value
    const topProjectsRes = await pool.query(\`SELECT project_name, project_value FROM projects WHERE 1=1 \${pFilter} ORDER BY project_value DESC LIMIT 5\`);

    // PIC Project Handling Stats
    const picStatsRes = await pool.query(\`
      SELECT COALESCE(u.full_name, 'Belum Ada PIC') as pic_name, COUNT(p.id) as total_projects
      FROM projects p
      LEFT JOIN users u ON p.pic_user_id = u.id
      WHERE 1=1 \${pFilter}
      GROUP BY u.full_name
      ORDER BY total_projects DESC
    \`);

    // All Projects list for dashboard table`;

if(regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('server.js', content, 'utf8');
    console.log('Fixed successfully');
} else {
    console.log('Regex did not match!');
}
