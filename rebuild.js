const fs = require('fs');
const fullCode = fs.readFileSync('C:/Users/haryanto/AppData/Roaming/Code/User/History/-12916349/ZNFJ.jsx', 'utf-8');

const getBlock = (startStr, endStr) => {
    const start = fullCode.indexOf(startStr);
    const end = fullCode.indexOf(endStr, start);
    return fullCode.substring(start, end + endStr.length);
};

const imports = "import React, { useState, useEffect } from 'react';\n" +
"import { LayoutDashboard, FolderKanban, Users, ArrowLeft, Plus, X, Settings, Table2, GanttChartSquare, LogOut, Search, ShieldCheck, KeyRound, FileSpreadsheet, CheckCircle2, Download, List, Trash2, Activity, AlertCircle, Calendar, Rocket, Briefcase, Info } from 'lucide-react';\n" +
"const API_URL = 'http://localhost:3000';\n\n";

const succToastCode = getBlock('function SuccessToast(', '    );\n}');
const sortTasksCode = getBlock('function sortTasksHierarchically(tasks) {', '    return sorted;\n}');

// ProjectDetail starts at fullCode.indexOf('function ProjectDetail') and ends at fullCode.lastIndexOf('export default App')
const mainCode = fullCode.substring(fullCode.indexOf('function ProjectDetail'), fullCode.lastIndexOf('export default App'));

let pdCode = imports + succToastCode + "\n\n" + sortTasksCode + "\n\n" + mainCode + "\nexport default ProjectDetail;\n";

// Now apply our patch for "Keterangan" and "setExpandedTaskId(null)"
pdCode = pdCode.replace(
    '        showSuccess(Perubahan pada tugas "\" berhasil disimpan! Data tampilan diperbarui.);\n    };',
    '        showSuccess(Perubahan pada tugas "\" berhasil disimpan! Data tampilan diperbarui.);\n        setExpandedTaskId(null);\n    };'
);

pdCode = pdCode.replace(
    '                                        <th>Progress</th>\n                                        <th></th>',
    '                                        <th>Progress</th>\n                                        <th>Keterangan</th>\n                                        <th></th>'
);

pdCode = pdCode.replace(
    '                                                        <span style={{ fontSize: \'13px\', fontWeight: \'600\', color: \'var(--secondary-800)\' }}>{task.progress_percentage}%</span>\n                                                    </div>\n                                                </td>\n                                                <td>\n                                                    {canManageTask(task.id) ? (',
    '                                                        <span style={{ fontSize: \'13px\', fontWeight: \'600\', color: \'var(--secondary-800)\' }}>{task.progress_percentage}%</span>\n                                                    </div>\n                                                </td>\n                                                <td style={{ maxWidth: \'150px\' }}>\n                                                    <div style={{ fontSize: \'12px\', color: \'var(--secondary-600)\', whiteSpace: \'nowrap\', overflow: \'hidden\', textOverflow: \'ellipsis\' }} title={task.notes || \'\'}>\n                                                        {task.notes || \'-\'}\n                                                    </div>\n                                                </td>\n                                                <td>\n                                                    {canManageTask(task.id) ? ('
);

pdCode = pdCode.replace(
    '                                                    <td colSpan="6" style={{ padding: 0 }}>\n                                                        <TaskEditPanel',
    '                                                    <td colSpan="8" style={{ padding: 0 }}>\n                                                        <TaskEditPanel'
);

pdCode = pdCode.replace(
    '                                            <td colSpan="6" style={{ textAlign: \'center\', padding: \'32px\', color: \'var(--secondary-500)\' }}>Belum ada tugas WBS.</td>',
    '                                            <td colSpan="8" style={{ textAlign: \'center\', padding: \'32px\', color: \'var(--secondary-500)\' }}>Belum ada tugas WBS.</td>'
);

fs.writeFileSync('d:/PROJECT APS PM/aplikasi-pm/src/pages/ProjectDetail.jsx', pdCode);
console.log("Rebuilt ProjectDetail.jsx from scratch properly.");
