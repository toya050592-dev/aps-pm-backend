const fs = require('fs');

const path = 'aplikasi-pm/src/pages/DocumentTracking.jsx';
let content = fs.readFileSync(path, 'utf8');

// The file has several modals:
// 1. {/* Document Modal */}
// 2. {/* Modal Keterangan */}
// 3. {/* Handover History Modal */}
// 4. <div className="table-responsive"> ... </table> ... </div>

const docModalStart = content.indexOf('{/* Document Modal */}');
// find the closing </div> of Document Modal. Since it's huge, let's find the start of Handover History Modal.
const handoverModalStart = content.indexOf('{/* Handover History Modal */}');
const ketModalStart = content.indexOf('{/* Modal Keterangan */}');
const tableStart = content.indexOf('<div className="table-responsive">');
const tableEnd = content.indexOf('</div>', content.indexOf('</table>')) + 6;

console.log("docModal:", docModalStart);
console.log("handoverModal:", handoverModalStart);
console.log("ketModal:", ketModalStart);
console.log("table:", tableStart, "-", tableEnd);
