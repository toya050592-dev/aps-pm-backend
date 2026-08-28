const fs = require('fs');

// Fix DocumentTracking.jsx
let dtCode = fs.readFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', 'utf8');
dtCode = dtCode.replace('historyList={historyList}', 'teamRekonUsers={teamRekonUsers}');
dtCode = dtCode.replace('users={users}', 'users={teamManagementUsers}');
fs.writeFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', dtCode);

// Fix DetailModal.jsx
let dmCode = fs.readFileSync('aplikasi-pm/src/components/DocumentTracking/DetailModal.jsx', 'utf8');
dmCode = dmCode.replace('historyList,', 'teamRekonUsers,');
fs.writeFileSync('aplikasi-pm/src/components/DocumentTracking/DetailModal.jsx', dmCode);

console.log('Fixed Document Tracking references.');
