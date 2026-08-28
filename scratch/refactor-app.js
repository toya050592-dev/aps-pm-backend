const fs = require('fs');

let c = fs.readFileSync('aplikasi-pm/src/App.jsx', 'utf8');

// 1. Tambahkan Import Services
if (!c.includes('projectService')) {
    c = c.replace(
        "import JadwalOnsitePage from './pages/JadwalOnsitePage';",
        "import JadwalOnsitePage from './pages/JadwalOnsitePage';\nimport { projectService } from './services/projectService';\nimport { masterDataService } from './services/masterDataService';\nimport { authService } from './services/authService';\nimport { userService } from './services/userService';"
    );
}

// 2. Auth Check (useEffect)
c = c.replace(
    /const res = await fetch\(`\$\{API_URL\}\/api\/auth\/check`, \{[^}]+\}\);\s*if \(res\.ok\) \{\s*const data = await res\.json\(\);/,
    "const data = await authService.checkAuth();\n            if (data) {"
);

// 3. Logout
c = c.replace(
    /await fetch\(`\$\{API_URL\}\/api\/logout`, \{\s*method: 'POST',\s*headers: \{ 'Authorization': `Bearer \$\{localStorage\.getItem\('token'\)\}` \}\s*\}\);/,
    "await authService.logout();"
);

// 4. fetchProjects
c = c.replace(
    /const response = await fetch\(`\$\{API_URL\}\/api\/projects`\);\s*const data = await response\.json\(\);/,
    "const data = await projectService.getProjects();"
);

// 5. fetchUsers
c = c.replace(
    /const response = await fetch\(`\$\{API_URL\}\/api\/users`\);\s*const data = await response\.json\(\);/,
    "const data = await userService.getAllUsers();"
);

// 6. Master Data (Produk, Status, Marketing)
c = c.replace(
    /const res = await fetch\(`\$\{API_URL\}\/api\/master-data\?type=JENIS_PRODUK`\);\s*const d = await res\.json\(\);/,
    "const d = await masterDataService.getByType('JENIS_PRODUK');"
);
c = c.replace(
    /const resStatus = await fetch\(`\$\{API_URL\}\/api\/master-data\?type=STATUS_Project`\);\s*const dStatus = await resStatus\.json\(\);/,
    "const dStatus = await masterDataService.getByType('STATUS_Project');"
);
c = c.replace(
    /const resMarketing = await fetch\(`\$\{API_URL\}\/api\/master-data\?type=MARKETING`\);\s*const dMarketing = await resMarketing\.json\(\);/,
    "const dMarketing = await masterDataService.getByType('MARKETING');"
);

// 7. Delete Project
const oldDelete = `const response = await fetch(\`\${API_URL}/api/projects/\${projectId}\`, { method: 'DELETE' });
            if (response.ok) {
                await fetchProjects();
                showSuccess('Project berhasil dihapus');
            } else {
                alert('Gagal menghapus project');
            }`;
const newDelete = `await projectService.deleteProject(projectId);
            await fetchProjects();
            showSuccess('Project berhasil dihapus');`;
c = c.replace(oldDelete, newDelete);
c = c.replace(/catch \(err\) \{\s*console\.error\(err\);\s*alert\('Terjadi kesalahan'\);\s*\}/g, "catch (err) { console.error(err); alert(err.message || 'Terjadi kesalahan'); }");

// 8. Add Project
const oldAdd = `const response = await fetch(\`\${API_URL}/api/projects\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setShowAddModal(false);
                resetForm();
                await fetchProjects();
                showSuccess('Project berhasil ditambahkan');
            } else {
                const data = await response.json();
                alert(data.error || 'Gagal menambah project');
            }`;
const newAdd = `await projectService.createProject(payload);
            setShowAddModal(false);
            resetForm();
            await fetchProjects();
            showSuccess('Project berhasil ditambahkan');`;
c = c.replace(oldAdd, newAdd);

// 9. Edit Project
const oldEdit = `const response = await fetch(\`\${API_URL}/api/projects/\${projectId}\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setEditingProject(null);
                resetForm();
                await fetchProjects();
                showSuccess('Project berhasil diperbarui');
            } else {
                const data = await response.json();
                alert(data.error || 'Gagal memperbarui project');
            }`;
const newEdit = `await projectService.updateProject(projectId, payload);
            setEditingProject(null);
            resetForm();
            await fetchProjects();
            showSuccess('Project berhasil diperbarui');`;
c = c.replace(oldEdit, newEdit);

// 10. BAST Upload
const oldBast = `const response = await fetch(\`\${API_URL}/api/projects/\${uploadingBastId}/bast\`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                setShowBastModal(false);
                setBastFile(null);
                setUploadingBastId(null);
                await fetchProjects();
                showSuccess('Berhasil mengunggah dokumen BAST');
            } else {
                alert('Gagal mengunggah BAST');
            }`;
const newBast = `await projectService.uploadBast(uploadingBastId, formData);
            setShowBastModal(false);
            setBastFile(null);
            setUploadingBastId(null);
            await fetchProjects();
            showSuccess('Berhasil mengunggah dokumen BAST');`;
c = c.replace(oldBast, newBast);

// 11. Download Template
const oldTemplate = `const response = await fetch(\`\${API_URL}/api/projects/export-template\`);
            if (!response.ok) throw new Error('Gagal mengunduh template');
            const blob = await response.blob();`;
const newTemplate = `const blob = await projectService.exportTemplate();`;
c = c.replace(oldTemplate, newTemplate);

// 12. Download Error Log
const oldErrorLog = `const response = await fetch(\`\${API_URL}/api/projects/import-errors-excel\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ errors: importResult.errors })
            });
            if (!response.ok) throw new Error('Gagal mengunduh log');
            const blob = await response.blob();`;
const newErrorLog = `const blob = await projectService.downloadImportErrors(importResult.errors);`;
c = c.replace(oldErrorLog, newErrorLog);

// 13. Import Projects
const oldImport = `const response = await fetch(\`\${API_URL}/api/projects/import\`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                showSuccess(\`Berhasil mengimpor \${data.successCount || data.importedCount} project.\`);
                await fetchProjects();
            } else if (data.errors && data.errors.length > 0) {
                alert(\`IMPOR DIBATALKAN TOTAL.\\n\\nDitemukan \${data.errors.length} baris yang error. Seluruh perubahan telah di-rollback.\\nSilakan unduh file Log Error untuk melihat detailnya.\`);
                setImportResult(data);
                // Do not fetchProjects because transaction rolled back, nothing was added.
            } else {
                alert(data.error || 'Gagal mengimpor data.');
            }`;
const newImport = `const data = await projectService.importProjects(formData);
            showSuccess(\`Berhasil mengimpor \${data.successCount || data.importedCount} project.\`);
            await fetchProjects();`;
c = c.replace(oldImport, newImport);
// The catch block of handleImportProject needs to handle the 400 transaction rollback properly.
// Oh wait, if the rollback happens, the old catch block was:
/*
        } catch (err) {
            console.error(err);
            alert('Kesalahan jaringan saat mengimpor project.');
        }
*/
const oldImportCatch = `} catch (err) {
            console.error(err);
            alert('Kesalahan jaringan saat mengimpor project.');
        }`;
const newImportCatch = `} catch (err) {
            console.error(err);
            const data = err.data || {};
            if (data.errors && data.errors.length > 0) {
                alert(\`IMPOR DIBATALKAN TOTAL.\\n\\nDitemukan \${data.errors.length} baris yang error. Seluruh perubahan telah di-rollback.\\nSilakan unduh file Log Error untuk melihat detailnya.\`);
                setImportResult(data);
            } else {
                alert(err.message || 'Kesalahan saat mengimpor project.');
            }
        }`;
c = c.replace(oldImportCatch, newImportCatch);

fs.writeFileSync('aplikasi-pm/src/App.jsx', c);
console.log('App.jsx refactored successfully');
