import React, { useState, useEffect } from 'react';
import GanttChart from '../components/GanttChart';
import { taskService } from '../services/taskService';
import { userService } from '../services/userService';
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
            const data = await taskService.getTasksByProjectId(project.id);
            setTasks(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            setTasks([]);
        }
    };

    const handleExportExcel = async () => {
        try {
            setExporting(true);
            const blob = await taskService.exportWbs(project.id);
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
            const data = await taskService.importWbs(project.id, formData);
            showSuccess(`Berhasil mengimpor ${data.count || data.importedCount} tugas WBS!`);
            await fetchTasks();
        } catch (err) {
            console.error(err);
            const data = err.data || {};
            if (data.details && data.details.length > 0) {
                alert(`${data.error || err.message}\n\nDetail Error:\n${data.details.join('\\n')}\n\n(Seluruh proses impor dibatalkan)`);
            } else {
                alert(err.message || 'Gagal mengimpor WBS.');
            }
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
                                                    {task.assignees && task.assignees.length > 0 ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {task.assignees.map(a => (
                                                                <span key={a.id} className="modern-badge badge-success" title={a.role} style={{ fontSize: '11px', padding: '2px 6px' }}>
                                                                    {a.full_name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--secondary-400)', fontStyle: 'italic', fontSize: '12px' }}>Belum ada PIC</span>
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
export default ProjectDetail;
