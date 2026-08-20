import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FolderKanban, Users, ArrowLeft, Plus, X, Settings, Table2, GanttChartSquare, LogOut, Search, ShieldCheck, KeyRound, FileSpreadsheet, CheckCircle2, Download, List, Trash2, Activity, AlertCircle, Calendar, Rocket, Briefcase, Info } from 'lucide-react';

const API_URL = '';

const ROLE_COLORS = {
    Admin: { bg: '#fef2f2', text: '#991b1b' },
    ProjectManager: { bg: '#eff6ff', text: '#1d4ed8' },
    TeamMember: { bg: '#f0fdf4', text: '#166534' }
};

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
}

function hasAccess(user, moduleKey) {
    if (user.role === 'Admin') return true;
    return (user.permissions || []).includes(moduleKey);
}


function SuccessToast({ message, onClose }) {
    if (!message) return null;
    return (
        <div style={{
            position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#10b981', color: '#ffffff',
            padding: '12px 20px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, fontSize: '14px', fontWeight: '600'
        }}>
            <CheckCircle2 size={18} />
            <span>{message}</span>
            <X size={16} style={{ cursor: 'pointer', marginLeft: '10px', opacity: 0.8 }} onClick={onClose} />
        </div>
    );
}

function sortTasksHierarchically(tasks) {
    const byParent = {};
    const taskMap = {};
    tasks.forEach(t => {
        const key = t.parent_task_id || 'root';
        if (!byParent[key]) byParent[key] = [];
        byParent[key].push(t);
        taskMap[t.id] = t;
    });

    const getEffectiveDate = (taskId) => {
        const children = byParent[taskId] || [];
        let minDate = taskMap[taskId]?.plan_start_date ? new Date(taskMap[taskId].plan_start_date).getTime() : 0;
        
        if (children.length > 0) {
            if (minDate === 0) minDate = Infinity;
            children.forEach(c => {
                const childDate = getEffectiveDate(c.id);
                if (childDate > 0 && childDate < minDate) {
                    minDate = childDate;
                }
            });
            if (minDate === Infinity) minDate = 0;
        }
        return minDate;
    };

    // Urutkan secara kronologis berdasarkan plan_start_date efektif
    Object.keys(byParent).forEach(key => {
        byParent[key].sort((a, b) => getEffectiveDate(a.id) - getEffectiveDate(b.id));
    });

    const result = [];
    function walk(parentId, level) {
        const children = byParent[parentId || 'root'] || [];
        children.forEach(t => {
            result.push({ ...t, level });
            walk(t.id, level + 1);
        });
    }
    walk(null, 0);
    return result;
}

function ProjectDetail({ project, currentUser, onBack }) {
    const [tasks, setTasks] = useState([]);
    const [taskName, setTaskName] = useState('');
    const [planStart, setPlanStart] = useState('');
    const [planEnd, setPlanEnd] = useState('');
    const [parentTaskId, setParentTaskId] = useState('');
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [viewMode, setViewMode] = useState('table');
    const [exporting, setExporting] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [importLoading, setImportLoading] = useState(false);
    const [showWbsInfo, setShowWbsInfo] = useState(false);

    const showSuccess = (msg) => {
        setToastMessage(msg);
        setTimeout(() => { setToastMessage(''); }, 3500);
    };

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => { await fetchTasks(); };
    const fetchTasks = async () => {
        try {
            const r = await fetch(`${API_URL}/api/tasks/${project.id}`);
            const data = await r.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            setTasks([]);
        }
    };

    const handleExportExcel = async () => {
        try {
            setExporting(true);
            const response = await fetch(`${API_URL}/api/projects/${project.id}/export-wbs`);
            if (!response.ok) {
                alert('Gagal mengekspor data WBS ke Excel.');
                setExporting(false);
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = project.project_name.replace(/[^a-zA-Z0-9_\-]/g, '_');
            a.download = `Laporan_WBS_${safeName}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showSuccess('Laporan Excel WBS berhasil diunduh!');
        } catch (err) {
            console.error('Ekspor gagal:', err);
            alert('Terjadi kesalahan saat mengunduh laporan Excel.');
        } finally {
            setExporting(false);
        }
    };

    const handleDownloadWbsTemplate = () => {
        window.open(`${API_URL}/api/template-wbs`, '_blank');
    };

    const handleImportWbs = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_URL}/api/projects/${project.id}/import-wbs`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                showSuccess(`Berhasil mengimpor ${data.importedCount} tugas WBS!`);
                await fetchTasks();
            } else {
                alert(data.error || 'Gagal mengimpor WBS.');
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat mengunggah file.');
        } finally {
            setImportLoading(false);
            e.target.value = '';
        }
    };

    const calcHK = (start, end) => {
        if (!start || !end) return null;
        const d1 = new Date(start), d2 = new Date(end);
        let count = 0;
        for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) count++;
        }
        return count;
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!taskName || !planStart || !planEnd) return;
        const addedName = taskName;
        const response = await fetch(`${API_URL}/api/tasks`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: project.id, parent_task_id: parentTaskId || null, task_name: taskName,
                plan_start_date: planStart, plan_end_date: planEnd,
                plan_hk: calcHK(planStart, planEnd), status: 'Not_Started',
                created_by: currentUser.full_name
            })
        });
        if (response.ok) {
            setTaskName(''); setPlanStart(''); setPlanEnd(''); setParentTaskId('');
            await fetchTasks();
            showSuccess(`Tugas WBS "${addedName}" berhasil disimpan! Data tampilan diperbarui.`);
        }
    };

    const handleDeleteTask = async (taskId, taskName) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus tugas WBS "${taskName}"?`)) return;
        try {
            const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (response.ok) {
                await fetchTasks();
                showSuccess(data.message || `Tugas "${taskName}" berhasil dihapus.`);
            } else {
                alert(data.error || 'Gagal menghapus tugas.');
            }
        } catch (e) {
            console.error(e);
            alert('Kesalahan saat menghapus tugas.');
        }
    };

    const handleSaveTaskDetail = async (task, formValues) => {
        const { task_name, plan_start_date, plan_end_date, actual_start_date, actual_end_date, notes, progress_percentage } = formValues;
        const plan_hk = calcHK(plan_start_date, plan_end_date);
        const actual_hk = calcHK(actual_start_date, actual_end_date);
        const status = progress_percentage >= 100 ? 'Completed' : (progress_percentage > 0 ? 'In_Progress' : 'Not_Started');
        
        await fetch(`${API_URL}/api/tasks/${task.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                task_name, plan_start_date: plan_start_date || null, plan_end_date: plan_end_date || null, plan_hk,
                progress_percentage, status, actual_start_date: actual_start_date || null, actual_end_date: actual_end_date || null, actual_hk, notes, updated_by: currentUser.full_name 
            })
        });
        await fetchTasks();
        showSuccess(`Perubahan pada tugas berhasil disimpan! Data tampilan diperbarui.`);
        setExpandedTaskId(null);
    };

    const canManageTask = (taskId) => currentUser.role === 'Admin' || project.pic_user_id === currentUser.id;
    const sortedTasks = sortTasksHierarchically(tasks);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <button onClick={onBack} className="modern-btn modern-btn-secondary" style={{ display: 'inline-flex', marginBottom: '24px' }}>
                    <ArrowLeft size={16} /> Kembali ke Daftar Project
                </button>

                <header style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--secondary-900)', letterSpacing: '-0.5px' }}>{project.project_name}</h1>
                    <p style={{ color: 'var(--secondary-500)', fontSize: '15px', marginTop: '6px' }}>Work Breakdown Structure & Timeline</p>
                </header>

                {toastMessage && (
                    <div style={{ backgroundColor: 'var(--success-bg)', border: '1px solid #86efac', color: 'var(--success-text)', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <CheckCircle2 size={20} /> {toastMessage}
                    </div>
                )}

                {currentUser.role === 'Admin' && (
                    <div className="modern-card" style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--secondary-800)', margin: 0 }}>Tambah Tugas WBS</h3>
                            <button type="button" onClick={() => setShowWbsInfo(!showWbsInfo)} className="modern-btn" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 12px', fontSize: '12px' }}>
                                <Info size={14} style={{ marginRight: '6px' }} /> Panduan Pengisian
                            </button>
                        </div>

                        {showWbsInfo && (
                            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderLeft: '4px solid #3b82f6', borderRadius: '0 8px 8px 0', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                <strong style={{ color: '#0f172a' }}>Panduan Input WBS & Import Excel:</strong>
                                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                    <li><strong>Input Manual:</strong> Isi Nama Tugas, pilih Induk (jika ini adalah sub-tugas dari tugas lain), dan set rentang tanggal Plan Start & End. Klik tombol "+ Tambah Tugas".</li>
                                    <li><strong>Format Induk (Parent) saat Import Excel:</strong> Kolom "PARENT ID" diisi dengan ID dari tugas induknya. Kosongkan jika ini adalah tugas level utama (Level 1).</li>
                                    <li><strong>Import Excel:</strong> Selalu unduh Template WBS terbaru untuk melihat daftar tugas yang sudah ada beserta ID-nya. Upload file yang sudah diedit menggunakan tombol "📤 Import Excel" di bagian Daftar Tugas di bawah.</li>
                                </ul>
                            </div>
                        )}
                        <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-600)', marginBottom: '8px' }}>Nama Tugas</label>
                                <input type="text" className="modern-input" value={taskName} onChange={e => setTaskName(e.target.value)} required placeholder="Mis: Analisis Kebutuhan" />
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-600)', marginBottom: '8px' }}>Induk Tugas WBS</label>
                                <select className="modern-input" value={parentTaskId} onChange={e => setParentTaskId(e.target.value)}>
                                    <option value="">-- Tanpa Induk (Level 1) --</option>
                                    {(tasks || []).filter(t => !t.parent_task_id).map(t => (
                                        <option key={t.id} value={t.id}>{t.task_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ width: '150px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-600)', marginBottom: '8px' }}>Plan Start</label>
                                <input type="date" className="modern-input" value={planStart} onChange={e => setPlanStart(e.target.value)} required />
                            </div>
                            <div style={{ width: '150px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-600)', marginBottom: '8px' }}>Plan End</label>
                                <input type="date" className="modern-input" value={planEnd} onChange={e => setPlanEnd(e.target.value)} required />
                            </div>
                            <button type="submit" className="modern-btn" style={{ padding: '10px 24px' }}>
                                <Plus size={18} /> Tambah Tugas
                            </button>
                        </form>
                    </div>
                )}

                <div className="modern-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--secondary-800)' }}>Daftar Tugas</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={handleExportExcel} className="modern-btn badge-success" disabled={exporting}>
                                {exporting ? 'Mengekspor...' : <><Download size={16} /> Ekspor Excel</>}
                            </button>
                            <button onClick={handleDownloadWbsTemplate} className="modern-btn" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}>
                                📥 Template
                            </button>
                            <label className="modern-btn" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', cursor: 'pointer', margin: 0 }}>
                                {importLoading ? '⏳ Import...' : '📤 Import Excel'}
                                <input type="file" accept=".xlsx, .xls" onChange={handleImportWbs} style={{ display: 'none' }} disabled={importLoading} />
                            </label>
                            <button onClick={() => setViewMode('table')} className="modern-btn" style={{ backgroundColor: viewMode === 'table' ? 'var(--secondary-900)' : 'var(--secondary-100)', color: viewMode === 'table' ? '#fff' : 'var(--secondary-800)' }}>
                                <List size={16} /> Tabel List
                            </button>
                            <button onClick={() => setViewMode('gantt')} className="modern-btn" style={{ backgroundColor: viewMode === 'gantt' ? 'var(--secondary-900)' : 'var(--secondary-100)', color: viewMode === 'gantt' ? '#fff' : 'var(--secondary-800)' }}>
                                <GanttChartSquare size={16} /> Gantt Chart
                            </button>
                        </div>
                    </div>

                    {viewMode === 'gantt' ? (
                        <GanttChart tasks={sortedTasks} project={project} canManageTask={canManageTask} onDeleteTask={handleDeleteTask} />
                    ) : (
                        <div className="modern-table-container">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        <th>Nama Tugas</th>
                                        <th>PIC</th>
                                        <th>Plan</th>
                                        <th>Status</th>
                                        <th>Progress</th>
                                        <th>Keterangan</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedTasks.map((task, index) => (
                                        <React.Fragment key={task.id}>
                                            <tr>
                                                <td style={{ color: 'var(--secondary-500)', fontWeight: '600' }}>
                                                    {index + 1}
                                                </td>
                                                <td style={{ fontWeight: task.level > 0 ? 'normal' : '500', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: task.level > 0 ? `${task.level * 24}px` : '8px' }}>
                                                    {task.level > 0 && <span style={{ color: '#2dd4bf', marginRight: '6px' }}>•</span>}
                                                    {task.task_name}
                                                    {canManageTask(task.id) && (
                                                        <button
                                                            onClick={() => handleDeleteTask(task.id, task.task_name)}
                                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
                                                            title="Hapus Tugas"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                                <td>
                                                    {project.pic_name ? (
                                                        <span className="modern-badge badge-success">
                                                            {project.pic_name}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--secondary-400)' }}>-</span>
                                                    )}
                                                </td>
                                                <td style={{ color: 'var(--secondary-500)' }}>
                                                    {task.plan_start_date ? task.plan_start_date.split('T')[0] : '-'} s/d {task.plan_end_date ? task.plan_end_date.split('T')[0] : '-'} ({task.plan_hk} HK)
                                                </td>
                                                <td>
                                                    <span className={`modern-badge badge-${(task.status || 'Not_Started') === 'Completed' ? 'success' : (task.status || 'Not_Started') === 'In_Progress' ? 'planning' : 'danger'}`}>
                                                        {(task.status || 'Not_Started').replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ width: '80px', height: '8px', backgroundColor: 'var(--secondary-100)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${task.progress_percentage}%`, height: '100%', backgroundColor: 'var(--primary-500)' }} />
                                                        </div>
                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--secondary-800)' }}>{task.progress_percentage}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ maxWidth: '150px' }}>
                                                    <div style={{ fontSize: '12px', color: 'var(--secondary-600)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={task.notes || ''}>
                                                        {task.notes || '-'}
                                                    </div>
                                                </td>
                                                <td>
                                                    {canManageTask(task.id) ? (
                                                        <button onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                                            className="modern-btn modern-btn-secondary" style={{ padding: '6px 12px' }}>
                                                            <Settings size={14} /> Kelola
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: '12px', color: 'var(--secondary-400)' }}>Bukan tugas Anda</span>
                                                    )}
                                                </td>
                                            </tr>
                                            {expandedTaskId === task.id && canManageTask(task.id) && (
                                                <tr>
                                                    <td colSpan="8" style={{ padding: 0 }}>
                                                        <TaskEditPanel
                                                            task={task}
                                                            project={project}
                                                            currentUser={currentUser}
                                                            onSave={handleSaveTaskDetail}
                                                        />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                    {sortedTasks.length === 0 && (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--secondary-500)' }}>Belum ada tugas WBS.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------- GANTT CHART (DENGAN INDENTASI HIERARKI) ----------
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
                <td style={{ ...tdStyle, textAlign: 'center' }}>{project?.pic_name || '-'}</td>

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
                            {project?.pic_name || 'Haryanto'}
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


export default ProjectDetail;
