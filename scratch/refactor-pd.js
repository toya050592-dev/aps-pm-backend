const fs = require('fs');
let c = fs.readFileSync('aplikasi-pm/src/pages/ProjectDetail.jsx', 'utf8');

// Add imports
if (!c.includes('taskService')) {
    c = c.replace("import GanttChart from '../components/GanttChart';", "import GanttChart from '../components/GanttChart';\nimport { taskService } from '../services/taskService';\nimport { userService } from '../services/userService';");
}

// 1. fetchTasks
c = c.replace(
    /const r = await fetch\(`\$\{API_URL\}\/api\/tasks\/\$\{project\.id\}`\);\s*const data = await r\.json\(\);/,
    "const data = await taskService.getTasksByProjectId(project.id);"
);

// 2. getUsers
c = c.replace(
    /const r = await fetch\(`\$\{API_URL\}\/api\/users`\);\s*const data = await r\.json\(\);/,
    "const data = await userService.getAllUsers();"
);

// 3. handleExportWbs
c = c.replace(
    /const response = await fetch\(`\$\{API_URL\}\/api\/projects\/\$\{project\.id\}\/export-wbs`\);\s*if \(!response\.ok\)[^}]+}\s*const blob = await response\.blob\(\);/,
    "const blob = await taskService.exportWbs(project.id);"
);

// 4. handleImportWbs
const oldImportWbs = `        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(\`\${API_URL}/api/projects/\${project.id}/import-wbs\`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                showSuccess(\`Berhasil mengimpor \${data.count || data.importedCount} tugas WBS!\`);
                await fetchTasks();
            } else {
                if (data.details && data.details.length > 0) {
                    alert(\`\${data.error}\\n\\nDetail Error:\\n\${data.details.join('\\n')}\\n\\n(Seluruh proses impor dibatalkan)\`);
                } else {
                    alert(data.error || 'Gagal mengimpor WBS.');
                }
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat mengunggah file.');
        }`;

const newImportWbs = `        try {
            const formData = new FormData();
            formData.append('file', file);
            const data = await taskService.importWbs(project.id, formData);
            showSuccess(\`Berhasil mengimpor \${data.count || data.importedCount} tugas WBS!\`);
            await fetchTasks();
        } catch (err) {
            console.error(err);
            const data = err.data || {};
            if (data.details && data.details.length > 0) {
                alert(\`\${data.error || err.message}\\n\\nDetail Error:\\n\${data.details.join('\\n')}\\n\\n(Seluruh proses impor dibatalkan)\`);
            } else {
                alert(err.message || 'Gagal mengimpor WBS.');
            }
        }`;
c = c.replace(oldImportWbs, newImportWbs);

// 5. handleAddTask
const oldAddTask = `            const response = await fetch(\`\${API_URL}/api/tasks\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setShowAddModal(false);
                setNewTaskName('');
                setNewTaskStart('');
                setNewTaskEnd('');
                setNewTaskParent('');
                setNewTaskAssignees([]);
                await fetchTasks();
                showSuccess('Tugas berhasil ditambahkan');
            } else {
                const data = await response.json();
                alert(data.error || 'Gagal menambah tugas');
            }`;
const newAddTask = `            await taskService.createTask(payload);
            setShowAddModal(false);
            setNewTaskName('');
            setNewTaskStart('');
            setNewTaskEnd('');
            setNewTaskParent('');
            setNewTaskAssignees([]);
            await fetchTasks();
            showSuccess('Tugas berhasil ditambahkan');`;
c = c.replace(oldAddTask, newAddTask);
c = c.replace(/catch \(e\) \{\s*console\.error\(e\);\s*alert\('Terjadi kesalahan saat menambah tugas'\);\s*\}/, 
    "catch (e) { console.error(e); alert(e.message || 'Terjadi kesalahan saat menambah tugas'); }");


// 6. handleEditTask
const oldEditTask = `            const response = await fetch(\`\${API_URL}/api/tasks/\${editingTask.id}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setEditingTask(null);
                setEditTaskAssignees([]);
                await fetchTasks();
                showSuccess('Tugas berhasil diperbarui');
            } else {
                const data = await response.json();
                alert(data.error || 'Gagal memperbarui tugas');
            }`;
const newEditTask = `            await taskService.updateTask(editingTask.id, payload);
            setEditingTask(null);
            setEditTaskAssignees([]);
            await fetchTasks();
            showSuccess('Tugas berhasil diperbarui');`;
c = c.replace(oldEditTask, newEditTask);

// 7. handleDeleteTask
const oldDeleteTask = `            const response = await fetch(\`\${API_URL}/api/tasks/\${task.id}\`, { method: 'DELETE' });
            if (response.ok) {
                await fetchTasks();
                showSuccess('Tugas dihapus');
            } else {
                const data = await response.json();
                alert(data.error || 'Gagal menghapus tugas');
            }`;
const newDeleteTask = `            await taskService.deleteTask(task.id);
            await fetchTasks();
            showSuccess('Tugas dihapus');`;
c = c.replace(oldDeleteTask, newDeleteTask);

fs.writeFileSync('aplikasi-pm/src/pages/ProjectDetail.jsx', c);
console.log("ProjectDetail refactored");
