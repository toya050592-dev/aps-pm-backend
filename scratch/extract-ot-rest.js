const fs = require('fs');

let c = fs.readFileSync('aplikasi-pm/src/pages/OvertimePage.jsx', 'utf8');
const lines = c.split('\n');

const formStart = lines.findIndex(l => l.includes('{/* Form Pengajuan Lembur */}'));
const formEnd = lines.findIndex((l, i) => i > formStart && l.includes('</form>')) + 2; // +2 to include the closing div

const tableStart = lines.findIndex(l => l.includes('<table className="modern-table"'));
const tableEnd = lines.findIndex((l, i) => i > tableStart && l.includes('</table>')) + 1;

if (formStart === -1 || tableStart === -1) {
    console.error("Bounds not found");
    process.exit(1);
}

// 1. EXTRACT OVERTIME FORM
const formCode = lines.slice(formStart, formEnd).join('\n');
const formComponentCode = `import React from 'react';
import { Plus } from 'lucide-react';

export default function OvertimeForm({ 
    showForm, 
    handleSubmit, 
    formData, 
    setFormData, 
    users, 
    loading 
}) {
    if (!showForm) return null;

    return (
        <div style={{ flex: '1', minWidth: '320px', animation: 'slideDown 0.3s ease-out' }}>
${formCode}
        </div>
    );
}
`;
fs.writeFileSync('aplikasi-pm/src/components/Overtime/OvertimeForm.jsx', formComponentCode.replace('{showForm && (', '').replace('                {/* Form Pengajuan Lembur */}', '').replace(/}\s*\)$/s, '')); // Remove the conditional wrapper since we do early return

// 2. EXTRACT OVERTIME TABLE
const tableCode = lines.slice(tableStart, tableEnd).join('\n');
// We need to know what dependencies the table has: CheckCircle, XCircle, Trash2, Camera, Eye, Clock, FileText, role, handleApprove, setPhotoPreviewUrl, handleDelete
const tableComponentCode = `import React from 'react';
import { CheckCircle, XCircle, Trash2, Camera, Eye, Clock, FileText } from 'lucide-react';

export default function OvertimeTable({ 
    requests, 
    role, 
    onApprove, 
    onDelete, 
    onPhotoClick 
}) {
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
${tableCode}
    );
}
`;
// Wait, we need to replace filteredRequests with requests, setPhotoPreviewUrl with onPhotoClick, handleDelete with onDelete, handleApprove with onApprove
let processedTableCode = tableComponentCode.replace(/filteredRequests/g, 'requests');
processedTableCode = processedTableCode.replace(/setPhotoPreviewUrl\(/g, 'onPhotoClick(');
processedTableCode = processedTableCode.replace(/handleDelete\(/g, 'onDelete(');
processedTableCode = processedTableCode.replace(/handleApprove\(/g, 'onApprove(');

fs.writeFileSync('aplikasi-pm/src/components/Overtime/OvertimeTable.jsx', processedTableCode);

// 3. UPDATE OVERTIME PAGE
const newPageLines = [
    ...lines.slice(0, formStart),
    `                <OvertimeForm 
                    showForm={showForm}
                    handleSubmit={handleSubmit}
                    formData={formData}
                    setFormData={setFormData}
                    users={users}
                    loading={loading}
                />`,
    ...lines.slice(formEnd, tableStart),
    `                <OvertimeTable 
                    requests={filteredRequests}
                    role={role}
                    onApprove={(id, status) => handleApprove(id, status)}
                    onDelete={handleDelete}
                    onPhotoClick={setPhotoPreviewUrl}
                />`,
    ...lines.slice(tableEnd)
];

let finalPageCode = newPageLines.join('\n');
finalPageCode = finalPageCode.replace(
    "import React, { useState, useEffect } from 'react';", 
    "import React, { useState, useEffect } from 'react';\nimport OvertimeForm from '../components/Overtime/OvertimeForm';\nimport OvertimeTable from '../components/Overtime/OvertimeTable';"
);

fs.writeFileSync('aplikasi-pm/src/pages/OvertimePage.jsx', finalPageCode);

console.log("Extraction complete!");
