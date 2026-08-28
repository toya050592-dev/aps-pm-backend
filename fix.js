const fs = require('fs');
let code = fs.readFileSync('aplikasi-pm/src/components/MasterData.jsx', 'utf8');

code = code.replace(/import React, \{ useState, useEffect \} from 'react';/, "import React, { useState, useEffect } from 'react';\nimport { api } from '../services/api';");

code = code.replace(
  /const res = await fetch\([^\)]+\);\s*setData\(await res\.json\(\)\);/,
  "const res = await api.get(`/api/master-data?type=${activeTab}`);\n            setData(Array.isArray(res) ? res : []);"
);

code = code.replace(
  /await fetch\([\s\S]*?method: 'POST'[\s\S]*?\}\);/,
  "await api.post(`/api/master-data`, { type: activeTab, name: newItemName });"
);

code = code.replace(
  /await fetch\([^,]+?\/status[^\)]*?method: 'PUT'[\s\S]*?\}\);/,
  "await api.put(`/api/master-data/${id}/status`, { is_active: !currentStatus });"
);

code = code.replace(
  /await fetch\([\s\S]*?method: 'PUT'[\s\S]*?name: editingName[\s\S]*?\}\);/,
  "await api.put(`/api/master-data/${id}`, { name: editingName });"
);

fs.writeFileSync('aplikasi-pm/src/components/MasterData.jsx', code);
console.log('Fixed');
