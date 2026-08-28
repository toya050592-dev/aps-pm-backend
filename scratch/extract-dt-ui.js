const fs = require('fs');

let c = fs.readFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', 'utf8');

const tableStartIdx = c.indexOf('            {/* Table */}');
const tableEndIdx = c.indexOf('</div>', c.indexOf('</div>', c.indexOf('</div>', c.indexOf('</div>', c.indexOf('</button>', c.indexOf('Selanjutnya')))))) + 7;
// A safer way is to just use lines
const lines = c.split('\n');
const tableStartLine = lines.findIndex(l => l.includes('{/* Table */}'));
const tableEndLine = lines.findIndex((l, i) => i > tableStartLine && l.includes('Selanjutnya')) + 6;

const modalStartLine = lines.findIndex(l => l.includes('{/* DETAIL MODAL (PRO MAX CARDS LAYOUT) */}'));
const modalEndLine = lines.findIndex((l, i) => i > modalStartLine && l.includes('Simpan Perubahan')) + 6;

if (tableStartLine === -1 || modalStartLine === -1) {
    console.log("Not found");
    process.exit(1);
}

// 1. TABLE CODE
const tableLines = lines.slice(tableStartLine, tableEndLine);
// Need to replace some variable names
let tableStr = tableLines.join('\n');
tableStr = tableStr.replace(/filteredDocs/g, 'documents');
tableStr = tableStr.replace(/handleOpenModal/g, 'onEdit');
tableStr = tableStr.replace(/handleDelete/g, 'onDelete');
tableStr = tableStr.replace(/\{\s*setKetData\(\{ id: doc\.id, keterangan: doc\.keterangan \|\| '' \}\);\s*setShowKetModal\(true\);\s*\}/g, '{() => onEditKeterangan(doc)}');

const tableComponent = `import React from 'react';
import { Edit2, Trash2, MessageSquare, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function DocumentTable({ 
    documents, 
    currentPage, 
    setCurrentPage, 
    itemsPerPage, 
    totalPages, 
    getStatusBadge, 
    onEdit, 
    onEditKeterangan, 
    onDelete 
}) {
    return (
${tableStr}
    );
}
`;

fs.writeFileSync('aplikasi-pm/src/components/DocumentTracking/DocumentTable.jsx', tableComponent);

// 2. MODAL CODE
const modalLines = lines.slice(modalStartLine, modalEndLine);
let modalStr = modalLines.join('\n');

const modalComponent = `import React from 'react';
import { X, CheckCircle2, ChevronRight, Upload, Calendar, Building2, User, FileText, AlertCircle, Send, Check } from 'lucide-react';

export default function DetailModal({
    isOpen,
    onClose,
    selectedDoc,
    formData,
    setFormData,
    filesToUpload,
    handleFileChange,
    STEPS,
    vendors,
    marketingPics,
    historyList,
    users,
    handoverForm,
    setHandoverForm,
    handleSubmitHandover,
    handleReceiveHandover,
    currentUser,
    handleSave
}) {
    if (!isOpen) return null;

    return (
${modalStr}
    );
}
`;

fs.writeFileSync('aplikasi-pm/src/components/DocumentTracking/DetailModal.jsx', modalComponent.replace('{showModal && (', '').replace(/}\s*\)$/s, ''));

// 3. UPDATE DOCUMENT TRACKING
const newLines = [
    ...lines.slice(0, tableStartLine),
    `            <DocumentTable 
                documents={filteredDocs}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalPages={totalPages}
                getStatusBadge={getStatusBadge}
                onEdit={handleOpenModal}
                onEditKeterangan={(doc) => { setKetData({ id: doc.id, keterangan: doc.keterangan || '' }); setShowKetModal(true); }}
                onDelete={handleDelete}
            />`,
    ...lines.slice(tableEndLine, modalStartLine),
    `            <DetailModal 
                isOpen={showModal}
                onClose={handleCloseModal}
                selectedDoc={selectedDoc}
                formData={formData}
                setFormData={setFormData}
                filesToUpload={filesToUpload}
                handleFileChange={handleFileChange}
                STEPS={STEPS}
                vendors={vendors}
                marketingPics={marketingPics}
                historyList={historyList}
                users={users}
                handoverForm={handoverForm}
                setHandoverForm={setHandoverForm}
                handleSubmitHandover={handleSubmitHandover}
                handleReceiveHandover={handleReceiveHandover}
                currentUser={currentUser}
                handleSave={handleSave}
            />`,
    ...lines.slice(modalEndLine)
];

let finalCode = newLines.join('\n');
if (!finalCode.includes('DocumentTable')) {
    finalCode = finalCode.replace(
        "import KeteranganModal from '../components/DocumentTracking/KeteranganModal';",
        "import KeteranganModal from '../components/DocumentTracking/KeteranganModal';\nimport DocumentTable from '../components/DocumentTracking/DocumentTable';\nimport DetailModal from '../components/DocumentTracking/DetailModal';"
    );
}

fs.writeFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', finalCode);
console.log('Extraction complete');
