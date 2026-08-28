const fs = require('fs');

let c = fs.readFileSync('aplikasi-pm/src/pages/OvertimePage.jsx', 'utf8');

// 1. Tambahkan Import Services
if (!c.includes('overtimeService')) {
    c = c.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { overtimeService } from '../services/overtimeService';\nimport { userService } from '../services/userService';"
    );
}

// 2. fetchOvertimes
c = c.replace(
    /const res = await fetch\(`\$\{API_URL\}\/api\/overtime`\);\s*const data = await res\.json\(\);/,
    "const data = await overtimeService.getAll();"
);

// 3. fetchUsers
c = c.replace(
    /const res = await fetch\(`\$\{API_URL\}\/api\/users`\);\s*const data = await res\.json\(\);/,
    "const data = await userService.getAllUsers();"
);

// 4. Submit Overtime
const oldSubmit = `const res = await fetch(\`\${API_URL}/api/overtime\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setShowAddModal(false);
                resetForm();
                fetchOvertimes();
                alert('Pengajuan Lembur berhasil');
            } else {
                const err = await res.json();
                alert(err.message || 'Gagal mengajukan lembur');
            }`;
const newSubmit = `await overtimeService.create(payload);
            setShowAddModal(false);
            resetForm();
            fetchOvertimes();
            alert('Pengajuan Lembur berhasil');`;
c = c.replace(oldSubmit, newSubmit);
c = c.replace(/catch \(error\) \{\s*console\.error\(error\);\s*alert\('Terjadi kesalahan saat menyimpan data'\);\s*\}/,
    "catch (error) { console.error(error); alert(error.message || 'Terjadi kesalahan saat menyimpan data'); }");

// 5. Approve/Reject
const oldApprove = `const res = await fetch(\`\${API_URL}/api/overtime/\${id}/approve\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchOvertimes();
                alert(\`Status lembur berhasil diupdate menjadi \${status}\`);
            } else {
                const err = await res.json();
                alert(err.message || 'Gagal update status lembur');
            }`;
const newApprove = `await overtimeService.approve(id, { status });
            fetchOvertimes();
            alert(\`Status lembur berhasil diupdate menjadi \${status}\`);`;
c = c.replace(oldApprove, newApprove);

// 6. Delete
const oldDelete = `const res = await fetch(\`\${API_URL}/api/overtime/\${id}\`, { method: 'DELETE' });
            if (res.ok) {
                fetchOvertimes();
                alert('Data lembur dihapus');
            } else {
                alert('Gagal menghapus data lembur');
            }`;
const newDelete = `await overtimeService.delete(id);
            fetchOvertimes();
            alert('Data lembur dihapus');`;
c = c.replace(oldDelete, newDelete);
c = c.replace(/catch \(error\) \{\s*console\.error\(error\);\s*alert\('Terjadi kesalahan'\);\s*\}/g,
    "catch (error) { console.error(error); alert(error.message || 'Terjadi kesalahan'); }");

fs.writeFileSync('aplikasi-pm/src/pages/OvertimePage.jsx', c);
console.log('OvertimePage refactored successfully');
