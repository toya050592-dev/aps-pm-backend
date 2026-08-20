const fs = require('fs');

const fullCode = fs.readFileSync('C:/Users/haryanto/AppData/Roaming/Code/User/History/-12916349/ZNFJ.jsx', 'utf-8');

// Find ProjectDetail function
const pdStart = fullCode.indexOf('function ProjectDetail(');

// Find TaskEditPanel function
const tepStart = fullCode.indexOf('function TaskEditPanel(');

// Find GanttChart function
const ganttStart = fullCode.indexOf('// ---------- GANTT CHART');

// The end of TaskEditPanel is where the next major component or end of file is.
// Actually, in ZNFJ.jsx, what comes after TaskEditPanel?
// Let's just find the end by looking for the next top-level function or component.
