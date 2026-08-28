const fs = require('fs');

let c = fs.readFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', 'utf8');

const startStr = '{/* Modal Keterangan */}';
const startIdx = c.indexOf(startStr);
const endIdx = c.indexOf(')}', startIdx) + 2;

if (startIdx !== -1) {
    const oldBlock = c.substring(startIdx, endIdx);
    c = c.replace(oldBlock, '<KeteranganModal \n                showKetModal={showKetModal} \n                setShowKetModal={setShowKetModal} \n                ketData={ketData} \n                setKetData={setKetData} \n                handleSaveKeterangan={handleSaveKeterangan} \n            />');
}

if (!c.includes('KeteranganModal')) {
    c = c.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport KeteranganModal from '../components/DocumentTracking/KeteranganModal';"
    );
}

fs.writeFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', c);
