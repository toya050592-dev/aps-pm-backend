const fs = require('fs');

const appPath = 'd:/PROJECT APS PM/aplikasi-pm/src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

const startIdx = content.indexOf('function DashboardSummary() {');
let endIdx = content.indexOf('// ---------- DETAIL Project (WBS)');
if (endIdx === -1) endIdx = content.indexOf('export default App;');

const dashboardContent = content.substring(startIdx, endIdx);

const newComponent = `import React, { useState, useEffect } from 'react';
import { Activity, Briefcase, Users, Clock, AlertCircle } from 'lucide-react';

const API_URL = 'http://127.0.0.1:3000';

` + dashboardContent + `
export default DashboardSummary;
`;

fs.writeFileSync('d:/PROJECT APS PM/aplikasi-pm/src/components/DashboardSummary.jsx', newComponent);

content = content.substring(0, startIdx) + content.substring(endIdx);
content = content.replace(/import ProjectDetail from '\.\/pages\/ProjectDetail';/, `import ProjectDetail from './pages/ProjectDetail';\nimport DashboardSummary from './components/DashboardSummary';`);

fs.writeFileSync(appPath, content);
console.log('Extracted DashboardSummary');
