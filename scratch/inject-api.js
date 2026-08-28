const fs = require('fs');
let c = fs.readFileSync('aplikasi-pm/src/components/GanttChart.jsx', 'utf8');
c = c.replace("import { Trash2 } from 'lucide-react';", "import { Trash2 } from 'lucide-react';\n\nconst API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';");
fs.writeFileSync('aplikasi-pm/src/components/GanttChart.jsx', c);
