const fs = require('fs');
let c = fs.readFileSync('aplikasi-pm/src/components/GanttChart.jsx', 'utf8');

const fd = `const monthsIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return \`\${d.getDate()} \${monthsIndo[d.getMonth()].substring(0, 3)} \${d.getFullYear()}\`;
};

`;

c = c.replace('function GanttChart', fd + 'function GanttChart');
fs.writeFileSync('aplikasi-pm/src/components/GanttChart.jsx', c);
