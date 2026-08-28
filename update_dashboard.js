const fs = require("fs");
let content = fs.readFileSync("controllers/dashboardController.js", "utf8");

const missingQueries = `
    const [upcomingTasksRes] = await mysqlPool.query(
      "SELECT t.task_name, t.plan_end_date as end_date, p.project_name FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.status != 'Completed' AND t.plan_end_date >= CURRENT_DATE " + tFilter + " ORDER BY t.plan_end_date ASC LIMIT 5"
    );

    const [attentionProjectsRes] = await mysqlPool.query(
      "SELECT p.id, p.project_name, p.status, p.issues, p.baseline_end_date, p.progress, (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'Completed') as completed_tasks_count, (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks_count FROM projects p WHERE ((p.issues IS NOT NULL AND TRIM(COALESCE(p.issues, '')) != '' AND TRIM(COALESCE(p.issues, '')) != '-') OR p.status = 'On Hold') " + pFilter + " LIMIT 5"
    );

    const [topProjectsRes] = await mysqlPool.query("SELECT project_name, project_value FROM projects WHERE 1=1 " + pFilter + " ORDER BY project_value DESC LIMIT 5");

    const [picStatsRes] = await mysqlPool.query(
      "SELECT COALESCE(u.full_name, 'Belum Ada PIC') as pic_name, COUNT(p.id) as total_projects FROM projects p LEFT JOIN users u ON p.pic_user_id = u.id WHERE 1=1 " + pFilter + " GROUP BY u.full_name ORDER BY total_projects DESC"
    );
`;

const resJsonReplacement = `
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
      })),
      upcomingMilestones: upcomingTasksRes,
      attentionProjects: attentionProjectsRes,
      topProjects: topProjectsRes,
      picStats: picStatsRes
    });
`;

// Replace from `res.json({` to `    });` 
content = content.replace(/res\.json\(\{[\s\S]*?\}\);\s*\} catch/g, missingQueries + "\n" + resJsonReplacement + "\n  } catch");
fs.writeFileSync("controllers/dashboardController.js", content);

