const fs = require('fs');

let dtcCode = fs.readFileSync('aplikasi-pm/src/components/DocumentTracking/DocumentTable.jsx', 'utf8');
dtcCode = dtcCode.replace('onDelete \n}) {', 'onDelete,\n    loading\n}) {');
fs.writeFileSync('aplikasi-pm/src/components/DocumentTracking/DocumentTable.jsx', dtcCode);
console.log('Fixed DocumentTable props.');
