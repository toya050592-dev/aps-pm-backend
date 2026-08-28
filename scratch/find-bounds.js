const fs = require('fs');
const lines = fs.readFileSync('aplikasi-pm/src/pages/OvertimePage.jsx', 'utf8').split('\n');
lines.forEach((l, i) => {
    if (l.includes('{/* Form Pengajuan Lembur */}')) console.log('Form Start:', i);
    if (l.includes('</form>')) console.log('Form End:', i);
    if (l.includes('<table className=')) console.log('Table Start:', i);
    if (l.includes('</table>')) console.log('Table End:', i);
});
