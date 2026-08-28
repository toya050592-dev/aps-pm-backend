const fs = require('fs');
const apiUrlDecl = `\nconst API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';\n`;
const files = [
  'aplikasi-pm/src/components/OnsiteSchedule.jsx',
  'aplikasi-pm/src/components/ReportHub.jsx',
  'aplikasi-pm/src/pages/JadwalOnsitePage.jsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('API_URL')) {
    // Insert after the last import
    content = content.replace(/(import .*;\n)+/, match => match + apiUrlDecl);
  }
  // Replace 'https://aps-pm-backend.onrender.com/api/...' with `${API_URL}/api/...`
  content = content.replace(/'https:\/\/aps-pm-backend\.onrender\.com([^']*)'/g, '`${API_URL}$1`');
  // Replace `https://aps-pm-backend.onrender.com/api/...` with `${API_URL}/api/...`
  content = content.replace(/`https:\/\/aps-pm-backend\.onrender\.com([^`]*)`/g, '`${API_URL}$1`');
  fs.writeFileSync(f, content);
});
console.log('URLs updated!');
