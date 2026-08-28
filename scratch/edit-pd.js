const fs = require('fs');

let c = fs.readFileSync('aplikasi-pm/src/pages/ProjectDetail.jsx', 'utf8');

// 1. Tambahkan import taskService
if (!c.includes('taskService')) {
    c = c.replace("import GanttChart from '../components/GanttChart';", "import GanttChart from '../components/GanttChart';\nimport { taskService } from '../services/taskService';");
}

// 2. Refactor fetchTasks
c = c.replace(/const r = await fetch\(`\$\{API_URL\}\/api\/tasks\/\$\{project\.id\}`\);\s*const data = await r\.json\(\);/, "const data = await taskService.getTasksByProjectId(project.id);");

// 3. Refactor exportWbs
c = c.replace(/const response = await fetch\(`\$\{API_URL\}\/api\/projects\/\$\{project\.id\}\/export-wbs`\);\s*if \(\!response\.ok\) \{[^}]*\}\s*const blob = await response\.blob\(\);/, "const blob = await taskService.exportWbs(project.id);");

// 4. Refactor importWbs
c = c.replace(/const response = await fetch\(`\$\{API_URL\}\/api\/projects\/\$\{project\.id\}\/import-wbs`, \{\s*method: 'POST',\s*body: formData\s*\}\);\s*const data = await response\.json\(\);/, "const data = await taskService.importWbs(project.id, formData);\n            const response = { ok: true }; // Stub because logic below uses response.ok");
// Wait, the logic below uses response.ok. 
// Since api.js throws on error, the try/catch will handle the error branch automatically!
// Let's rewrite the whole handleImportWbs manually via script is too dangerous. I'll use replace_file_content for specific blocks!
fs.writeFileSync('aplikasi-pm/src/pages/ProjectDetail.jsx', c);
