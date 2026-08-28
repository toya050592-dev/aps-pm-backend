const { mysqlPool } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const { period, startDate, endDate, productTypeId } = req.query;
    let pFilter = "";
    let tFilter = "";

    if (productTypeId) {
      const pid = parseInt(productTypeId, 10);
      if (!isNaN(pid)) {
        pFilter += ` AND product_type_id = ${pid}`;
        tFilter += ` AND project_id IN (SELECT id FROM projects WHERE product_type_id = ${pid})`;
      }
    }

    if (period === 'custom') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (startDate && dateRegex.test(startDate)) {
        pFilter += ` AND DATE(COALESCE(actual_end_date, baseline_end_date, created_at)) >= '${startDate}'`;
        tFilter += ` AND DATE(COALESCE(plan_end_date, CURRENT_DATE)) >= '${startDate}'`;
      }
      if (endDate && dateRegex.test(endDate)) {
        pFilter += ` AND DATE(COALESCE(actual_end_date, baseline_end_date, created_at)) <= '${endDate}'`;
        tFilter += ` AND DATE(COALESCE(plan_end_date, CURRENT_DATE)) <= '${endDate}'`;
      }
    } else if (period === 'this_month') {
      pFilter += " AND MONTH(COALESCE(actual_end_date, baseline_end_date, created_at)) = MONTH(CURRENT_DATE) AND YEAR(COALESCE(actual_end_date, baseline_end_date, created_at)) = YEAR(CURRENT_DATE)";
      tFilter += " AND MONTH(COALESCE(plan_end_date, CURRENT_DATE)) = MONTH(CURRENT_DATE) AND YEAR(COALESCE(plan_end_date, CURRENT_DATE)) = YEAR(CURRENT_DATE)";
    } else if (period === 'last_month') {
      pFilter += " AND MONTH(COALESCE(actual_end_date, baseline_end_date, created_at)) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH) AND YEAR(COALESCE(actual_end_date, baseline_end_date, created_at)) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH)";
      tFilter += " AND MONTH(COALESCE(plan_end_date, CURRENT_DATE)) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH) AND YEAR(COALESCE(plan_end_date, CURRENT_DATE)) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH)";
    } else if (period === 'this_year') {
      pFilter += " AND ((status IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND YEAR(COALESCE(actual_end_date, baseline_end_date, baseline_start_date, created_at)) = YEAR(CURRENT_DATE)) OR (status NOT IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project')))";
      tFilter += " AND project_id IN (SELECT id FROM projects WHERE ((status IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND YEAR(COALESCE(actual_end_date, baseline_end_date, baseline_start_date, created_at)) = YEAR(CURRENT_DATE)) OR (status NOT IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project'))))";
    } else if (period === 'by_year') {
      const yearVal = parseInt(req.query.year, 10);
      if (!isNaN(yearVal)) {
        pFilter += ` AND ((status IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND YEAR(COALESCE(actual_end_date, baseline_end_date, baseline_start_date, created_at)) = ${yearVal}) OR (status NOT IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND YEAR(CURRENT_DATE) = ${yearVal}))`;
        tFilter += ` AND project_id IN (SELECT id FROM projects WHERE ((status IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND YEAR(COALESCE(actual_end_date, baseline_end_date, baseline_start_date, created_at)) = ${yearVal}) OR (status NOT IN ('Go Live', 'Completed', 'Complete', 'On Hold', 'Cancel Project') AND YEAR(CURRENT_DATE) = ${yearVal})))`;
      }
    }

    const [projectCountRes] = await mysqlPool.query(`SELECT COUNT(*) as count FROM projects WHERE 1=1 ${pFilter}`);
    const totalProjects = parseInt(projectCountRes[0].count, 10);

    const [taskCountRes] = await mysqlPool.query(`SELECT COUNT(*) as count FROM tasks WHERE 1=1 ${tFilter}`);
    const totalTasks = parseInt(taskCountRes[0].count, 10);

    const [completedTaskRes] = await mysqlPool.query(`SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed' ${tFilter}`);
    const completedTasks = parseInt(completedTaskRes[0].count, 10);

    const [delayedTaskRes] = await mysqlPool.query(`SELECT COUNT(*) as count FROM tasks WHERE status != 'Completed' AND plan_end_date < CURRENT_DATE ${tFilter}`);
    const delayedTasks = parseInt(delayedTaskRes[0].count, 10);

    const [openIssueRes] = await mysqlPool.query(`SELECT COUNT(*) as count FROM projects WHERE issues IS NOT NULL AND TRIM(COALESCE(issues, '')) != '' AND TRIM(COALESCE(issues, '')) != '-' ${pFilter}`);
    const openIssues = parseInt(openIssueRes[0].count, 10);

    const [revenueRes] = await mysqlPool.query(`SELECT SUM(project_value) as total_nilai FROM projects WHERE 1=1 ${pFilter}`);
    const totalNilai = parseInt(revenueRes[0].total_nilai || 0, 10);

    const [realisasiRes] = await mysqlPool.query(`SELECT SUM(project_value) as total_realisasi FROM projects WHERE status = 'Go Live' ${pFilter}`);
    const totalRealisasi = parseInt(realisasiRes[0].total_realisasi || 0, 10);

    const [statusBreakdownRes] = await mysqlPool.query(`SELECT status, COUNT(*) as count, SUM(project_value) as total_value FROM projects WHERE 1=1 ${pFilter} GROUP BY status`);
    
    res.json({
      metrics: {
        totalProjects,
        totalTasks,
        completedTasks,
        delayedTasks,
        averageProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        openIssues,
        revenue: { total: totalNilai, kontrak: totalNilai, realisasi: totalRealisasi }
      },
      statusBreakdown: statusBreakdownRes.map(r => ({
        name: r.status,
        value: parseInt(r.count, 10),
        revenue: parseInt(r.total_value || 0, 10)
      }))
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
};
