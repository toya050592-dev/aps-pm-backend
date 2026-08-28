const fs = require('fs');

// 1. Fix DocumentTable.jsx
let dtcCode = fs.readFileSync('aplikasi-pm/src/components/DocumentTracking/DocumentTable.jsx', 'utf8');
dtcCode = dtcCode.replace('onDelete \n})', 'onDelete, \n    loading \n})');
fs.writeFileSync('aplikasi-pm/src/components/DocumentTracking/DocumentTable.jsx', dtcCode);

// 2. Fix DocumentTracking.jsx
let dtCode = fs.readFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', 'utf8');
dtCode = dtCode.replace(
    'documents={filteredDocs}', 
    'documents={filteredDocs}\n                loading={loading}'
);
fs.writeFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', dtCode);

console.log('Fixed DocumentTable loading error.');
