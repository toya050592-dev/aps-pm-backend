import fs from 'fs';
const img = fs.readFileSync('public/assets/admedika-logo.png');
const base64 = img.toString('base64');
fs.writeFileSync('src/assets/admedikaLogoBase64.js', 'export const admedikaLogoBase64 = "data:image/png;base64,' + base64 + '";');
