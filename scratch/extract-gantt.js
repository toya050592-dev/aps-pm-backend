const fs = require('fs');

let pd = fs.readFileSync('aplikasi-pm/src/pages/ProjectDetail.jsx', 'utf8');
const lines = pd.split('\n');
const startIndex = lines.findIndex(l => l.startsWith('function GanttChart('));
const exportIndex = lines.findIndex(l => l.startsWith('export default ProjectDetail;'));

if (startIndex === -1 || exportIndex === -1 || startIndex > exportIndex) {
    console.log("Could not find inline GanttChart or export!");
    process.exit(1);
}

// Extract GanttChart code (from startIndex to exportIndex - 1)
const gcLines = lines.slice(startIndex, exportIndex);
let ganttCode = gcLines.join('\n');

// Write to components/GanttChart.jsx with proper imports
const newGcCode = `import React from 'react';
import { Trash2 } from 'lucide-react';

${ganttCode}

export default GanttChart;
`;

fs.writeFileSync('aplikasi-pm/src/components/GanttChart.jsx', newGcCode);

// Remove GanttChart from ProjectDetail, keeping the export
const newPdLines = [...lines.slice(0, startIndex), ...lines.slice(exportIndex)];
let pdContent = newPdLines.join('\n');

// Add import to the top of ProjectDetail.jsx
pdContent = pdContent.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport GanttChart from '../components/GanttChart';");

fs.writeFileSync('aplikasi-pm/src/pages/ProjectDetail.jsx', pdContent);

console.log("GanttChart successfully extracted!");
