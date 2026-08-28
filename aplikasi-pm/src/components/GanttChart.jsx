import React from 'react';
import { Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const monthsIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate()} ${monthsIndo[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`;
};

function GanttChart({ tasks, project, canManageTask, onDeleteTask }) {
    // 1. Group Tasks (Root & Sub)
    const rootTasks = tasks.filter(t => !t.parent_task_id);
    const subTasksMap = {};
    tasks.filter(t => t.parent_task_id).forEach(t => {
        if (!subTasksMap[t.parent_task_id]) subTasksMap[t.parent_task_id] = [];
        subTasksMap[t.parent_task_id].push(t);
    });

    // Build timeline dates
    const allDates = [];
    tasks.forEach(t => {
        if (t.plan_start_date) allDates.push(new Date(t.plan_start_date));
        if (t.plan_end_date) allDates.push(new Date(t.plan_end_date));
    });

    if (allDates.length === 0) {
        allDates.push(new Date()); // fallback
    }

    const minDateRaw = new Date(Math.min(...allDates));
    const maxDateRaw = new Date(Math.max(...allDates));

    const minDate = new Date(minDateRaw);
    const dayMin = minDate.getDay();
    const diffToMondayMin = dayMin === 0 ? -6 : 1 - dayMin;
    minDate.setDate(minDate.getDate() + diffToMondayMin);
    minDate.setHours(0, 0, 0, 0);

    const maxDate = new Date(maxDateRaw);
    const dayMax = maxDate.getDay();
    const diffToSundayMax = dayMax === 0 ? 0 : 7 - dayMax;
    maxDate.setDate(maxDate.getDate() + diffToSundayMax);
    maxDate.setHours(23, 59, 59, 999);

    const weeks = [];
    const monthsMap = {};

    let curr = new Date(minDate);
    const monthsIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    let wCount = 1;
    while (curr <= maxDate) {
        const weekStart = new Date(curr);
        const weekEnd = new Date(curr);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const m = weekStart.getMonth();
        const y = weekStart.getFullYear();
        const mName = `${monthsIndo[m]} ${y}`;

        if (!monthsMap[mName]) {
            monthsMap[mName] = 0;
            wCount = 1;
        }
        monthsMap[mName]++;

        weeks.push({
            label: `W${wCount}`,
            dateLabel: `${weekStart.getDate()} ${monthsIndo[m].substring(0, 3)}`,
            start: weekStart,
            end: weekEnd,
            month: mName
        });

        curr.setDate(curr.getDate() + 7);
        wCount++;
    }

    const calcHK = (start, end) => {
        if (!start || !end) return '-';
        const d1 = new Date(start), d2 = new Date(end);
        let count = 0;
        for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) count++;
        }
        return count;
    };

    const isOverlap = (tStart, tEnd, wStart, wEnd) => {
        if (!tStart || !tEnd) return false;
        const ts = new Date(tStart).getTime();
        const te = new Date(tEnd).getTime();
        return ts <= wEnd.getTime() && te >= wStart.getTime();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return `${d.getDate()} ${monthsIndo[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`;
    };

    const getStatusStyle = (status) => {
        if (status === 'Completed') return { bg: '#dcfce7', text: '#166534', pill: '#22c55e' };
        if (status === 'In Progress') return { bg: '#ffedd5', text: '#c2410c', pill: '#f97316' };
        return { bg: '#ccfbf1', text: '#0f766e', pill: '#2dd4bf' }; // Not Started
    };

    // --- RENDER HELPERS ---
    const thStyle = {
        padding: '12px 8px',
        color: '#1e293b',
        borderBottom: '1px solid #e2e8f0',
        textAlign: 'center',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        fontSize: '11px'
    };

    const tdStyle = {
        padding: '10px 8px',
        borderBottom: '1px solid #f1f5f9',
        borderRight: '1px solid transparent', // remove vertical borders for data columns
        color: '#334155',
        whiteSpace: 'nowrap',
        backgroundColor: '#fff',
        fontSize: '11px',
        verticalAlign: 'middle'
    };

    const tdTimelineStyle = {
        padding: 0,
        borderBottom: '1px solid #f1f5f9',
        borderRight: '1px solid #f1f5f9', // faint vertical grid lines
        backgroundColor: '#fff',
        verticalAlign: 'middle',
        position: 'relative'
    };

    // Render a single task row (Root or Sub)
    const renderTaskRow = (t, index, isSubTask = false) => {
        const planHk = calcHK(t.plan_start_date, t.plan_end_date);
        const actHk = calcHK(t.actual_start_date, t.actual_end_date);
        const { bg, text, pill } = getStatusStyle(t.status);

        // Find start and end indices for rounding pill corners
        let startWkIdx = -1;
        let endWkIdx = -1;
        weeks.forEach((w, i) => {
            if (isOverlap(t.plan_start_date, t.plan_end_date, w.start, w.end)) {
                if (startWkIdx === -1) startWkIdx = i;
                endWkIdx = i;
            }
        });

        return (
            <tr key={t.id} style={{ '&:hover': { backgroundColor: '#f8fafc' } }}>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{!isSubTask ? index + 1 : ''}</td>
                <td style={{ ...tdStyle, fontWeight: isSubTask ? 'normal' : '600', textAlign: 'left', paddingLeft: isSubTask ? '24px' : '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div>
                            {isSubTask && <span style={{ color: '#2dd4bf', marginRight: '6px' }}>•</span>}
                            {t.task_name}
                        </div>
                        {canManageTask(t.id) && (
                            <button
                                onClick={() => onDeleteTask(t.id, t.task_name)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
                                title="Hapus Tugas"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {t.assignees && t.assignees.length > 0 
                        ? t.assignees.map(a => a.full_name).join(', ') 
                        : '-'}
                </td>

                <td style={{ ...tdStyle, textAlign: 'center' }}>{formatDate(t.plan_start_date)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{formatDate(t.plan_end_date)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{planHk}</td>

                <td style={{ ...tdStyle, textAlign: 'center' }}>{formatDate(t.actual_start_date)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{formatDate(t.actual_end_date)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{actHk}</td>

                <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{
                        backgroundColor: bg, color: text, padding: '4px 8px',
                        borderRadius: '4px', fontSize: '10px', fontWeight: '600'
                    }}>
                        {t.status || 'Not Started'}
                    </span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{t.progress_percentage || 0}%</td>

                {/* Timeline Grid */}
                {weeks.map((w, i) => {
                    const isOverlapping = isOverlap(t.plan_start_date, t.plan_end_date, w.start, w.end);
                    const isStart = i === startWkIdx;
                    const isEnd = i === endWkIdx;

                    return (
                        <td key={i} style={tdTimelineStyle}>
                            {isOverlapping && (
                                <div style={{
                                    height: '14px',
                                    backgroundColor: pill,
                                    borderTopLeftRadius: isStart ? '7px' : '0',
                                    borderBottomLeftRadius: isStart ? '7px' : '0',
                                    borderTopRightRadius: isEnd ? '7px' : '0',
                                    borderBottomRightRadius: isEnd ? '7px' : '0',
                                    width: '100%',
                                    margin: '6px 0' // vertical spacing in the cell
                                }} />
                            )}
                        </td>
                    );
                })}
            </tr>
        );
    };

    // Calculate totals for footer
    const totalActivities = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
    const notStartedTasks = tasks.filter(t => !t.status || t.status === 'Not Started').length;

    return (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {/* Header Section */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Project Manager</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981' }}><i data-lucide="user"></i></span>
                            {project?.pic_name || '-'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Company Name</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981' }}><i data-lucide="building"></i></span>
                            {project?.project_name || '-'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981' }}><i data-lucide="calendar"></i></span>
                            {project?.baseline_start_date ? formatDate(new Date(project.baseline_start_date)) : '-'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#475569' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} /> Completed
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f97316' }} /> In Progress
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2dd4bf' }} /> Not Started
                        </span>
                    </div>

                </div>
            </div>

            {/* Table Section */}
            <div style={{ overflowX: 'auto', backgroundColor: '#fff' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1600px', fontFamily: 'sans-serif' }}>
                    <thead>
                        {/* Main Header Row */}
                        <tr>
                            <th rowSpan={2} style={thStyle}>No</th>
                            <th rowSpan={2} style={{ ...thStyle, minWidth: '200px', textAlign: 'left' }}>Activity</th>
                            <th rowSpan={2} style={thStyle}>PIC</th>
                            <th colSpan={3} style={{ ...thStyle, borderBottom: 'none' }}>Plan</th>
                            <th colSpan={3} style={{ ...thStyle, borderBottom: 'none' }}>Actual</th>
                            <th rowSpan={2} style={thStyle}>Status</th>
                            <th rowSpan={2} style={thStyle}>Progress</th>

                            {/* Months headers */}
                            {Object.entries(monthsMap).map(([mName, count], i) => (
                                <th key={i} colSpan={count} style={{ ...thStyle, fontSize: '12px' }}>
                                    {mName}
                                </th>
                            ))}
                        </tr>
                        {/* Sub Header Row for Plan/Actual and Weeks */}
                        <tr>
                            {/* Plan */}
                            <th style={{ ...thStyle, fontSize: '10px', color: '#64748b' }}>Start</th>
                            <th style={{ ...thStyle, fontSize: '10px', color: '#64748b' }}>End</th>
                            <th style={{ ...thStyle, fontSize: '10px', color: '#64748b' }}>HK</th>
                            {/* Actual */}
                            <th style={{ ...thStyle, fontSize: '10px', color: '#64748b' }}>Start</th>
                            <th style={{ ...thStyle, fontSize: '10px', color: '#64748b' }}>End</th>
                            <th style={{ ...thStyle, fontSize: '10px', color: '#64748b' }}>HK</th>

                            {/* Weeks headers */}
                            {weeks.map((w, i) => (
                                <th key={i} style={{ ...thStyle, minWidth: '35px', padding: '6px 4px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#1e293b' }}>{w.label}</div>
                                    <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '2px', fontWeight: 'normal' }}>{w.dateLabel}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rootTasks.map((t, index) => (
                            <React.Fragment key={t.id}>
                                {renderTaskRow(t, index, false)}
                                {subTasksMap[t.id] && subTasksMap[t.id].map(subT => renderTaskRow(subT, index, true))}
                            </React.Fragment>
                        ))}
                        {rootTasks.length === 0 && (
                            <tr>
                                <td colSpan={11 + weeks.length} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                    Belum ada tugas pada project ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <i data-lucide="clipboard-list" style={{ width: '16px', height: '16px' }}></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Total Activities</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '15px' }}>{totalActivities}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#10b981' }}>
                        <i data-lucide="check-circle" style={{ width: '16px', height: '16px' }}></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Completed</div>
                        <div style={{ fontWeight: '600', color: '#10b981', fontSize: '15px' }}>
                            {completedTasks} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>({totalActivities ? Math.round((completedTasks / totalActivities) * 100) : 0}%)</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#f97316' }}>
                        <i data-lucide="clock" style={{ width: '16px', height: '16px' }}></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>In Progress</div>
                        <div style={{ fontWeight: '600', color: '#f97316', fontSize: '15px' }}>
                            {inProgressTasks} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>({totalActivities ? Math.round((inProgressTasks / totalActivities) * 100) : 0}%)</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0ea5e9' }}>
                        <i data-lucide="circle-dashed" style={{ width: '16px', height: '16px' }}></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Not Started</div>
                        <div style={{ fontWeight: '600', color: '#0ea5e9', fontSize: '15px' }}>
                            {notStartedTasks} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>({totalActivities ? Math.round((notStartedTasks / totalActivities) * 100) : 0}%)</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b' }}>
                        <i data-lucide="calendar-clock" style={{ width: '16px', height: '16px' }}></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Last Updated</div>
                        <div style={{ fontWeight: '500', color: '#334155', fontSize: '12px' }}>{formatDate(new Date())}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------- PANEL EDIT TUGAS ----------
function TaskEditPanel({ task, project, currentUser, onSave }) {
    const [editTaskName, setEditTaskName] = useState(task.task_name || '');
    const [editPlanStart, setEditPlanStart] = useState(task.plan_start_date ? task.plan_start_date.split('T')[0] : '');
    const [editPlanEnd, setEditPlanEnd] = useState(task.plan_end_date ? task.plan_end_date.split('T')[0] : '');
    const [actualStart, setActualStart] = useState(task.actual_start_date ? task.actual_start_date.split('T')[0] : '');
    const [actualEnd, setActualEnd] = useState(task.actual_end_date ? task.actual_end_date.split('T')[0] : '');
    const [notes, setNotes] = useState(task.notes || '');
    const [progress, setProgress] = useState(task.progress_percentage || 0);
    const [historyLogs, setHistoryLogs] = useState([]);

    const fetchHistory = async () => {
        try {
            const r = await fetch(`${API_URL}/api/tasks/${task.id}/history`);
            if (r.ok) setHistoryLogs(await r.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchHistory(); }, [task.id]);

    const handleSaveAndRefresh = async () => {
        await onSave(task, { 
            task_name: editTaskName, 
            plan_start_date: editPlanStart, 
            plan_end_date: editPlanEnd, 
            actual_start_date: actualStart, 
            actual_end_date: actualEnd, 
            notes, 
            progress_percentage: progress 
        });
        fetchHistory();
    };

    return (
        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>Informasi Utama Tugas</h4>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>Nama Tugas</label>
                    <input type="text" value={editTaskName} onChange={(e) => setEditTaskName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#64748b' }}>Plan Start</label>
                            <input type="date" value={editPlanStart} onChange={(e) => setEditPlanStart(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#64748b' }}>Plan End</label>
                            <input type="date" value={editPlanEnd} onChange={(e) => setEditPlanEnd(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>Realisasi (Actual) & Progress</h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#64748b' }}>Actual Start</label>
                            <input type="date" value={actualStart} onChange={(e) => setActualStart(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: '#64748b' }}>Actual End</label>
                            <input type="date" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                        </div>
                    </div>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>Progress %</label>
                    <select value={progress} onChange={(e) => setProgress(parseInt(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '8px' }}>
                        {[0, 10, 25, 50, 75, 90, 100].map(v => <option key={v} value={v}>{v}%</option>)}
                    </select>
                </div>
            </div>

            <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '11px', color: '#64748b' }}>Keterangan / Kendala</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Menunggu data dari klien, tertunda karena akses server..."
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minHeight: '60px', resize: 'vertical' }} />
            </div>

            <button onClick={handleSaveAndRefresh}
                style={{ marginTop: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                Simpan Perubahan
            </button>

            {/* RIWAYAT PERUBAHAN (HISTORY LOG) */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '10px' }}>
                    📜 Riwayat Perubahan (History Log)
                </h4>
                {historyLogs.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>Belum ada riwayat perubahan pada tugas ini.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {historyLogs.map(item => (
                            <div key={item.id} style={{ fontSize: '12px', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontWeight: 'bold', color: '#1e293b', marginRight: '6px' }}>{item.user_name}:</span>
                                    <span style={{ color: '#475569' }}>{item.action}</span>
                                </div>
                                <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap', marginLeft: '10px', fontWeight: '500' }}>
                                    📅 {item.created_at ? item.created_at.split('T')[0] : '-'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}



export default GanttChart;
