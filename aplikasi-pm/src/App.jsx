import React, { useState, useEffect, useMemo, useRef } from 'react';
import MasterDataModule from './components/MasterData';
import LoginPage from './pages/LoginPage';
import TeamManagement from './components/TeamManagement';
import ProjectDetail from './pages/ProjectDetail';
import DashboardSummary from './components/DashboardSummary';
import ErrorBoundary from './components/ErrorBoundary';
import { LayoutDashboard, FolderKanban, Users, ArrowLeft, Plus, X, Settings, Table2, GanttChartSquare, LogOut, Search, ShieldCheck, KeyRound, FileSpreadsheet, CheckCircle2, Download, List, Trash2, Activity, AlertCircle, Calendar, Rocket, Briefcase, Upload, Info, FileText, Clock, FileCheck, ListTodo } from 'lucide-react';
import DashboardRingkasan from './DashboardRingkasan';
import JadwalOnsitePage from './pages/JadwalOnsitePage';
import ReportHubPage from './pages/ReportHubPage';
import OvertimePage from './pages/OvertimePage';
import DocumentTracking from './pages/DocumentTracking';
import SerahTerimaDokumen from './pages/SerahTerimaDokumen';
import { io } from 'socket.io-client';

// Update API_URL to empty string to use Vite proxy, solving Dev Tunnels / HTTPS issues
export const API_URL = '';

const MODULE_LIST = [
    { key: 'summary', label: 'Dashboard Ringkasan' },
    { key: 'doc_tracking', label: 'Document Tracking' },
    { key: 'handover', label: 'Serah Terima Dokumen' },
    { key: 'onsite_schedule', label: 'Jadwal Onsite' },
    { key: 'reports', label: 'Pusat Laporan' },
    { key: 'overtime', label: 'Overtime (Lembur)' },
    { key: 'approve_overtime', label: 'Setujui Lembur (Approve)' },
    { key: 'dashboard', label: 'Project & WBS' },
    { key: 'master_data', label: 'Master Data' }
];

const ROLE_COLORS = {
    Admin: { bg: '#fef2f2', text: '#991b1b' },
    ProjectManager: { bg: '#eff6ff', text: '#1d4ed8' },
    TeamMember: { bg: '#f0fdf4', text: '#166534' },
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

// Menyusun daftar tugas menjadi urutan berjenjang (parent diikuti anak-anaknya), dengan info level kedalaman
function sortTasksHierarchically(tasks) {
    const byParent = {};
    tasks.forEach(t => {
        const key = t.parent_task_id || 'root';
        if (!byParent[key]) byParent[key] = [];
        byParent[key].push(t);
    });

    // Urutkan secara kronologis berdasarkan plan_start_date pada setiap level (seperti di Gantt Chart)
    Object.keys(byParent).forEach(key => {
        byParent[key].sort((a, b) => new Date(a.plan_start_date || 0) - new Date(b.plan_start_date || 0));
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


function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [page, setPage] = useState('summary');
    const [projects, setProjects] = useState([]);
    const [projectName, setProjectName] = useState('');
    const [projectPicId, setProjectPicId] = useState('');
    const [users, setUsers] = useState([]);
    const [productTypes, setProductTypes] = useState([]);
    const [projectStatuses, setProjectStatuses] = useState([]);
    const [marketingList, setMarketingList] = useState([]);
    const [projectProductTypeId, setProjectProductTypeId] = useState('');
    const [projectValue, setProjectValue] = useState('');
    const [projectStartDate, setProjectStartDate] = useState('');
    const [projectPicMarketingId, setProjectPicMarketingId] = useState('');
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [showProjectInfo, setShowProjectInfo] = useState(false);

    const [filterProductType, setFilterProductType] = useState('');
    const [filterPic, setFilterPic] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
    const [currentPage, setCurrentPage] = useState(1);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editProjectValue, setEditProjectValue] = useState('');
    const [editProjectStatus, setEditProjectStatus] = useState('');
    const [editProjectProgress, setEditProjectProgress] = useState('');
    const [editProjectIssues, setEditProjectIssues] = useState('');
    const [editProjectGolive, setEditProjectGolive] = useState('');
    const [editProjectStartDate, setEditProjectStartDate] = useState('');
    const [editProjectActualEndDate, setEditProjectActualEndDate] = useState('');
    const [editProjectMarketing, setEditProjectMarketing] = useState('');
    const [editProductType, setEditProductType] = useState('');
    const [activeProject, setActiveProject] = useState(null);
    const [toastMessage, setToastMessage] = useState('');
    
    // BAST states
    const bastFileInputRef = useRef(null);
    const [uploadingBastId, setUploadingBastId] = useState(null);
    const [showBastModal, setShowBastModal] = useState(false);
    const [selectedBastUrl, setSelectedBastUrl] = useState('');
    
    const handleBastFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file || !uploadingBastId) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`${API_URL}/api/projects/${uploadingBastId}/bast`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                showSuccess('File BAST berhasil diunggah.');
                await fetchProjects();
            } else {
                alert('Gagal mengunggah file BAST.');
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat mengunggah.');
        } finally {
            setUploadingBastId(null);
            e.target.value = null; // reset input
        }
    };

    const showSuccess = (msg) => {
        setToastMessage(msg);
        setTimeout(() => { setToastMessage(''); }, 3500);
    };

    useEffect(() => {
        const socket = io(API_URL);

        socket.on('new_project', (project) => {
            // Using a distinct notification message for real-time updates
            showSuccess(`(Real-time) Seseorang baru saja menambahkan project: ${project.project_name}`);
            // Automatically refresh the project list if we are on a page that needs it
            fetchProjects();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const savedUser = localStorage.getItem('pm_user');
        if (savedUser) {
            try { setCurrentUser(JSON.parse(savedUser)); } catch (e) { /* biarkan */ }
        }
        setAuthChecked(true);
    }, []);

    useEffect(() => {
        fetchProjects();
        fetchUsers();
        fetchMasterData();
    }, []);

    const fetchMasterData = async () => {
        try {
            const res = await fetch(`${API_URL}/api/master-data?type=JENIS_PRODUK`);
            if (res.ok) {
                const data = await res.json();
                setProductTypes(data.filter(d => d.is_active));
            }

            const resStatus = await fetch(`${API_URL}/api/master-data?type=STATUS_Project`);
            if (resStatus.ok) {
                const dataStatus = await resStatus.json();
                setProjectStatuses(dataStatus.filter(d => d.is_active));
            }

            const resMarketing = await fetch(`${API_URL}/api/master-data?type=MARKETING`);
            if (resMarketing.ok) {
                const dataMarketing = await resMarketing.json();
                setMarketingList(dataMarketing.filter(d => d.is_active));
            }
        } catch (e) { console.error(e); }
    };

    const fetchProjects = async () => {
        try {
            const response = await fetch(`${API_URL}/api/projects`);
            setProjects(await response.json());
        } catch (err) { console.error(err); }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`);
            setUsers(await response.json());
        } catch (err) { console.error(err); }
    };

    const handleDownloadLogError = async () => {
        if (!importResult || !importResult.errors) return;
        try {
            const response = await fetch(`${API_URL}/api/projects/import-errors-excel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ errors: importResult.errors })
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Log_Error_Import_Project.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDownloadProjectTemplate = async () => {
        try {
            const response = await fetch(`${API_URL}/api/projects/export-template`);
            if (!response.ok) throw new Error('Gagal mengunduh template');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Template_Import_Project.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            alert('Terjadi kesalahan saat mengunduh template.');
        }
    };

    const handleImportProject = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        
        setImportLoading(true);
        setImportResult(null);
        try {
            const response = await fetch(`${API_URL}/api/projects/import`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                showSuccess(`Berhasil mengimpor ${data.importedCount} project.`);
                await fetchProjects();
            } else if (data.errors && data.errors.length > 0) {
                alert(`Impor selesai sebagian. Berhasil: ${data.importedCount}, Gagal: ${data.failedCount}. Silakan unduh file Log Error.`);
                setImportResult(data);
                await fetchProjects();
            } else {
                alert(data.error || 'Gagal mengimpor data.');
            }
        } catch (err) {
            console.error(err);
            alert('Kesalahan jaringan saat mengimpor project.');
        } finally {
            setImportLoading(false);
            e.target.value = '';
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!projectName) return;
        try {
            const savedName = projectName;
            const response = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: projectName, status: 'Planning',
                    baseline_start_date: projectStartDate || new Date().toISOString().split('T')[0], baseline_end_date: '2026-12-31',
                    pic_user_id: projectPicId || null,
                    product_type_id: projectProductTypeId ? parseInt(projectProductTypeId, 10) : null,
                    project_value: projectValue ? parseInt(projectValue.replace(/[^0-9]/g, ''), 10) : 0,
                    pic_marketing_id: projectPicMarketingId ? parseInt(projectPicMarketingId, 10) : null
                })
            });
            const data = await response.json();
            if (response.ok) {
                setProjectName('');
                setProjectPicId('');
                setProjectPicMarketingId('');
                setProjectProductTypeId('');
                setProjectValue('');
                setProjectStartDate('');
                await fetchProjects();
                showSuccess(`Project "${savedName}" berhasil disimpan! Tampilan berhasil diperbarui.`);
            } else {
                alert('Gagal menyimpan Project. Silakan coba lagi.');
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan jaringan saat menyimpan Project.');
        }
    };

    const startEditProject = (proj) => {
        setEditingProjectId(proj.id);
        setEditProjectValue(proj.project_value ? new Intl.NumberFormat('id-ID').format(proj.project_value) : '');
        setEditProjectStatus(proj.status || '');
        setEditProjectProgress(proj.progress || '');
        setEditProjectIssues(proj.issues || '');
        setEditProjectGolive(proj.baseline_end_date ? proj.baseline_end_date.split('T')[0] : '');
        setEditProjectStartDate(proj.baseline_start_date ? proj.baseline_start_date.split('T')[0] : '');
        setEditProjectActualEndDate(proj.actual_end_date ? proj.actual_end_date.split('T')[0] : '');
        setEditProjectMarketing(proj.pic_marketing_id || '');
        setEditProductType(proj.product_type_id || '');
    };

    const cancelEditProject = () => {
        setEditingProjectId(null);
    };

    const saveEditProject = async (projectId) => {
        try {
            const rawValue = editProjectValue ? parseInt(editProjectValue.replace(/[^0-9]/g, ''), 10) : 0;
            const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: editProjectStatus,
                    project_value: rawValue,
                    progress: editProjectProgress,
                    issues: editProjectIssues,
                    target_golive: editProjectGolive,
                    baseline_start_date: editProjectStartDate,
                    actual_end_date: editProjectStatus === 'Complete' || editProjectStatus === 'Completed' || editProjectStatus === 'Go Live' || editProjectStatus === 'Golive' ? editProjectActualEndDate : null,
                    pic_marketing_id: editProjectMarketing ? parseInt(editProjectMarketing, 10) : null,
                    product_type_id: editProductType ? parseInt(editProductType, 10) : null,
                    last_updated_by: currentUser ? (currentUser.full_name || currentUser.username) : null
                })
            });
            if (response.ok) {
                await fetchProjects();
                setEditingProjectId(null);
                showSuccess('Project berhasil diperbarui.');
            } else {
                alert('Gagal memperbarui Project.');
            }
        } catch (err) {
            console.error(err);
            alert('Kesalahan jaringan saat memperbarui Project.');
        }
    };

    const handleDeleteProject = async (projectId, projectName) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus Project "${projectName}" secara permanen beserta semua tugasnya?`)) return;
        try {
            const response = await fetch(`${API_URL}/api/projects/${projectId}`, { method: 'DELETE' });
            if (response.ok) {
                await fetchProjects();
                showSuccess(`Project "${projectName}" berhasil dihapus.`);
            } else {
                alert('Gagal menghapus Project.');
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan jaringan.');
        }
    };

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem('pm_token');
            if (token) {
                await fetch(`${API_URL}/api/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (e) {
            console.error('Gagal logout di server:', e);
        }
        localStorage.removeItem('pm_token');
        localStorage.removeItem('pm_user');
        setCurrentUser(null);
        setActiveProject(null);
        setPage('summary');
    };

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('pm_token');
            if (!token) return;
            try {
                const res = await fetch(`${API_URL}/api/auth/check`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401) {
                    alert("Sesi Anda telah habis atau akun Anda digunakan di perangkat lain. Silakan login kembali.");
                    handleLogout();
                }
            } catch (err) {
                // ignore network errors
            }
        };

        if (currentUser) {
            checkAuth();
            const interval = setInterval(checkAuth, 30000); // 30 seconds
            return () => clearInterval(interval);
        }
    }, [currentUser]);

    const liveStats = useMemo(() => {
        const projArray = Array.isArray(projects) ? projects : [];
        const total = projArray.length;
        
        const statusCounts = {};
        projectStatuses.forEach(s => statusCounts[s.name] = 0);
        projArray.forEach(p => {
            if (statusCounts[p.status] !== undefined) {
                statusCounts[p.status]++;
            } else {
                statusCounts[p.status] = 1; 
            }
        });
        
        return { total, statusCounts };
    }, [projects, projectStatuses]);


    if (!authChecked) return null;
    if (!currentUser) return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;

    if (activeProject) {
        return <ProjectDetail project={activeProject} currentUser={currentUser} onBack={() => setActiveProject(null)} />;
    }

    const allowedPage = hasAccess(currentUser, page) || page === 'team' ? page : (hasAccess(currentUser, 'summary') ? 'summary' : 'dashboard');

    const filteredProjects = (Array.isArray(projects) ? projects : []).filter(p => {
        const startYear = p.baseline_start_date || p.created_at ? new Date(p.baseline_start_date || p.created_at).getFullYear() : 0;
        let projectYear = new Date().getFullYear(); // By default active projects fall into current year
        
        const status = String(p.status).toLowerCase();
        if (['go live', 'completed', 'complete', 'on hold', 'cancel project'].includes(status)) {
            projectYear = p.actual_end_date ? new Date(p.actual_end_date).getFullYear() : (p.baseline_end_date ? new Date(p.baseline_end_date).getFullYear() : startYear);
        }
        
        const selectedYear = parseInt(filterYear, 10);
        const matchesYear = !filterYear || projectYear === selectedYear;
        
        const matchPT = !filterProductType || String(p.product_type_id) === String(filterProductType) || String(p.product_type_name) === String(filterProductType);
        const matchPic = !filterPic || String(p.pic_user_id) === String(filterPic) || String(p.pic_name) === String(filterPic);
        const matchStatus = !filterStatus || String(p.status).trim().toLowerCase() === String(filterStatus).trim().toLowerCase();
        
        return matchesYear && matchPT && matchPic && matchStatus;
    });

    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const indexOfLastProject = currentPage * itemsPerPage;
    const indexOfFirstProject = indexOfLastProject - itemsPerPage;
    const currentProjects = filteredProjects.slice(indexOfFirstProject, indexOfLastProject);

    return (
        <div className="app-container">
            <div className="sidebar-container glass-panel">
                <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '32px', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FolderKanban color="var(--primary-500)" size={24} /> PM Dashboard
                </h2>

                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: 'white', marginBottom: '6px' }}>{currentUser.full_name}</p>
                    <span style={{ fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' }}>{currentUser.role}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    {hasAccess(currentUser, 'summary') && (
                        <div onClick={() => setPage('summary')} className={`sidebar-item ${allowedPage === 'summary' ? 'active' : ''}`}>
                            <LayoutDashboard size={18} /> Dashboard Ringkasan
                        </div>
                    )}
                    {hasAccess(currentUser, 'onsite_schedule') && (
                        <div onClick={() => setPage('onsite_schedule')} className={`sidebar-item ${allowedPage === 'onsite_schedule' ? 'active' : ''}`}>
                            <Calendar size={18} /> Jadwal Onsite
                        </div>
                    )}
                    {hasAccess(currentUser, 'doc_tracking') && (
                        <div onClick={() => setPage('doc_tracking')} className={`sidebar-item ${allowedPage === 'doc_tracking' ? 'active' : ''}`}>
                            <FileCheck size={18} /> Document Tracking
                        </div>
                    )}
                    {hasAccess(currentUser, 'handover') && (
                        <div onClick={() => setPage('handover')} className={`sidebar-item ${allowedPage === 'handover' ? 'active' : ''}`}>
                            <ListTodo size={18} /> Serah Terima Dokumen
                        </div>
                    )}
                    {hasAccess(currentUser, 'reports') && (
                        <div onClick={() => setPage('reports')} className={`sidebar-item ${allowedPage === 'reports' ? 'active' : ''}`}>
                            <FileSpreadsheet size={18} /> Pusat Laporan
                        </div>
                    )}
                    {hasAccess(currentUser, 'overtime') && (
                        <div onClick={() => setPage('overtime')} className={`sidebar-item ${allowedPage === 'overtime' ? 'active' : ''}`}>
                            <Clock size={18} /> Overtime
                        </div>
                    )}
                    {hasAccess(currentUser, 'dashboard') && (
                        <div onClick={() => setPage('dashboard')} className={`sidebar-item ${allowedPage === 'dashboard' ? 'active' : ''}`}>
                            <FolderKanban size={18} /> Project & WBS
                        </div>
                    )}
                    {hasAccess(currentUser, 'master_data') && (
                        <div onClick={() => setPage('master_data')} className={`sidebar-item ${allowedPage === 'master_data' ? 'active' : ''}`}>
                            <Settings size={18} /> Master Data
                        </div>
                    )}
                    <div onClick={handleLogout} className="sidebar-item" style={{ color: '#fca5a5', marginTop: '10px', borderLeft: '3px solid transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#fca5a5'}>
                        <LogOut size={18} /> Logout
                    </div>
                </div>
            </div>

            <div className="main-content">
                {toastMessage && (
                    <div style={{ backgroundColor: 'var(--success-bg)', border: '1px solid #86efac', color: 'var(--success-text)', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <CheckCircle2 size={20} /> {toastMessage}
                    </div>
                )}

                {allowedPage === 'master_data' && hasAccess(currentUser, 'master_data') ? (
                    <MasterDataModule currentUser={currentUser} TeamManagementComponent={TeamManagement} />
                ) : allowedPage === 'summary' && hasAccess(currentUser, 'summary') ? (
                    <DashboardRingkasan currentUser={currentUser} setPage={setPage} />
                ) : allowedPage === 'onsite_schedule' && hasAccess(currentUser, 'onsite_schedule') ? (
                    <JadwalOnsitePage currentUser={currentUser} />
                ) : allowedPage === 'doc_tracking' && hasAccess(currentUser, 'doc_tracking') ? (
                    <DocumentTracking currentUser={currentUser} />
                ) : allowedPage === 'handover' && hasAccess(currentUser, 'handover') ? (
                    <SerahTerimaDokumen currentUser={currentUser} />
                ) : allowedPage === 'reports' && hasAccess(currentUser, 'reports') ? (
                    <ReportHubPage currentUser={currentUser} />
                ) : allowedPage === 'overtime' && hasAccess(currentUser, 'overtime') ? (
                    <OvertimePage currentUser={currentUser} />
                ) : allowedPage === 'dashboard' && hasAccess(currentUser, 'dashboard') ? (
                    <>
                        <header style={{ marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <h1 style={{ fontSize: '32px', fontWeight: '900', background: 'linear-gradient(90deg, #1e293b, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px', margin: 0 }}>Project & Timeline</h1>
                            <p style={{ color: 'var(--secondary-500)', fontSize: '16px', marginTop: '8px' }}>Kelola struktur WBS dan pantau progres implementasi secara real-time.</p>
                        </header>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '36px' }}>
                            <div className="enterprise-card" style={{ padding: '24px', borderBottom: '4px solid #64748b' }}>
                                <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em' }}>TOTAL PROJECT</p>
                                <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '8px 0 0 0' }}>{liveStats.total}</h3>
                            </div>
                            {projectStatuses.map((s, idx) => {
                                const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
                                const color = colors[idx % colors.length];
                                return (
                                    <div key={s.id} className="enterprise-card" style={{ padding: '24px', borderBottom: `4px solid ${color}` }}>
                                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.name}</p>
                                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '8px 0 0 0' }}>{liveStats.statusCounts[s.name] || 0}</h3>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="modern-card" style={{ marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--secondary-800)', margin: 0 }}>Tambah Project Baru</h3>
                                <button type="button" onClick={() => setShowProjectInfo(!showProjectInfo)} className="modern-btn" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '6px 12px', fontSize: '12px' }}>
                                    <Info size={14} style={{ marginRight: '6px' }} /> Panduan Pengisian
                                </button>
                            </div>

                            {showProjectInfo && (
                                <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderLeft: '4px solid #3b82f6', borderRadius: '0 8px 8px 0', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                    <strong style={{ color: '#0f172a' }}>Panduan Pengisian & Import Excel:</strong>
                                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                        <li><strong>Nama Project:</strong> Wajib diisi, merupakan nama kontrak/project induk.</li>
                                        <li><strong>PIC Project & Jenis Produk:</strong> Pastikan Anda memilih dari dropdown. Jika mengimpor via Excel, pastikan penulisan nama PIC dan Jenis Produk di Excel <strong>sama persis</strong> (huruf besar/kecil & ejaan) dengan opsi yang ada di sistem.</li>
                                        <li><strong>Nilai Project:</strong> Cukup isi dengan angka (Contoh: 150000000). Jika via UI sistem akan otomatis memformat menjadi Rupiah.</li>
                                        <li><strong>Import Excel:</strong> Unduh Template Excel terlebih dahulu. Jangan ubah nama kolom di baris pertama. Upload file yang sudah diisi melalui tombol Import Excel.</li>
                                    </ul>
                                </div>
                            )}

                            {importResult && importResult.errors && (
                                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px' }}>
                                    <p style={{ color: '#991b1b', fontSize: '13px', fontWeight: '600', marginBottom: '8px', marginTop: 0 }}>
                                        Terdapat {importResult.failedCount} data project yang gagal diimpor.
                                    </p>
                                    <button type="button" onClick={handleDownloadLogError} className="modern-btn badge-error" style={{ fontSize: '12px', padding: '6px 12px' }}>
                                        Unduh Log Error (Excel)
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <input
                                    type="text" placeholder="Nama Project (Contoh: Implementasi RSKGM)..."
                                    value={projectName} onChange={(e) => setProjectName(e.target.value)}
                                    className="modern-input" style={{ flex: 2, minWidth: '220px' }}
                                />
                                <select
                                    value={projectPicId} onChange={(e) => setProjectPicId(e.target.value)}
                                    className="modern-select" style={{ flex: 1, minWidth: '180px' }}
                                >
                                    <option value="">-- Pilih PIC Project --</option>
                                    {users.filter(u => u.is_active).map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                    ))}
                                </select>
                                <select
                                    value={projectProductTypeId} onChange={(e) => setProjectProductTypeId(e.target.value)}
                                    className="modern-select" style={{ flex: 1, minWidth: '180px' }}
                                >
                                    <option value="">-- Pilih Jenis Produk --</option>
                                    {productTypes.map(pt => (
                                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={projectPicMarketingId} onChange={(e) => setProjectPicMarketingId(e.target.value)}
                                    className="modern-select" style={{ flex: 1, minWidth: '180px' }}
                                >
                                    <option value="">-- Pilih PIC Marketing --</option>
                                    {marketingList.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="date"
                                    value={projectStartDate} onChange={(e) => setProjectStartDate(e.target.value)}
                                    className="modern-input" style={{ flex: 1, minWidth: '150px' }}
                                    title="Tanggal Mulai Project"
                                />
                                <input
                                    type="text" placeholder="Nilai Project (Rp)..."
                                    value={projectValue} onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        if (val) {
                                            setProjectValue(new Intl.NumberFormat('id-ID').format(val));
                                        } else {
                                            setProjectValue('');
                                        }
                                    }}
                                    className="modern-input" style={{ flex: 1, minWidth: '150px' }}
                                />
                                <div style={{ display: 'flex', gap: '8px', flex: '1 1 100%', alignItems: 'center' }}>
                                    <button type="submit" className="modern-btn modern-btn-primary">
                                        Simpan Project
                                    </button>
                                    <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                                    <button type="button" onClick={handleDownloadProjectTemplate} className="modern-btn" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}>
                                        📥 Template Excel
                                    </button>
                                    <label className="modern-btn" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', cursor: 'pointer', margin: 0 }}>
                                        {importLoading ? '⏳ Import...' : '📤 Import Excel'}
                                        <input type="file" accept=".xlsx, .xls" onChange={handleImportProject} style={{ display: 'none' }} disabled={importLoading} />
                                    </label>
                                </div>
                            </form>
                        </div>

                        <div className="modern-card">
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--secondary-800)' }}>Daftar Project Aktif</h3>
                            
                            {/* Filter Section */}
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <select
                                    className="modern-select"
                                    value={filterYear}
                                    onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
                                    style={{ flex: '1', minWidth: '150px' }}
                                >
                                    <option value="">Semua Tahun</option>
                                    {[...Array(5)].map((_, i) => {
                                        const y = new Date().getFullYear() - 2 + i;
                                        return <option key={y} value={y}>{y}</option>;
                                    })}
                                </select>
                                <select 
                                    className="modern-select" 
                                    value={filterProductType} 
                                    onChange={(e) => { setFilterProductType(e.target.value); setCurrentPage(1); }}
                                    style={{ flex: '1', minWidth: '150px' }}
                                >
                                    <option value="">Semua Jenis Produk</option>
                                    {productTypes.map(pt => (
                                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                                    ))}
                                </select>
                                <select 
                                    className="modern-select" 
                                    value={filterPic} 
                                    onChange={(e) => { setFilterPic(e.target.value); setCurrentPage(1); }}
                                    style={{ flex: '1', minWidth: '150px' }}
                                >
                                    <option value="">Semua PIC Project</option>
                                    {users.filter(u => u.is_active).map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name}</option>
                                    ))}
                                </select>
                                <select 
                                    className="modern-select" 
                                    value={filterStatus} 
                                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                                    style={{ flex: '1', minWidth: '150px' }}
                                >
                                    <option value="">Semua Status</option>
                                    {projectStatuses.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="modern-table-container">
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>NAMA PROJECT</th>
                                            <th>PIC PROJECT</th>
                                            <th>PIC MARKETING</th>
                                            <th>TANGGAL MULAI</th>
                                            <th>JENIS PRODUK</th>
                                            <th>Nilai Project</th>
                                            <th>Status</th>
                                            <th>Progress</th>
                                            <th>Issue</th>
                                            <th>Target Golive</th>
                                            <th>Pembaharuan Terakhir</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentProjects.map((proj) => (
                                            <tr key={proj.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                <td style={{ fontWeight: '600' }}>{proj.project_name}</td>
                                                <td>{proj.pic_name || '-'}</td>
                                                <td>
                                                    {editingProjectId === proj.id ? (
                                                        <select className="modern-select" value={editProjectMarketing} onChange={(e) => setEditProjectMarketing(e.target.value)} style={{ width: '130px', padding: '4px' }}>
                                                            <option value="">-- Pilih --</option>
                                                            {marketingList.map(m => (
                                                                <option key={m.id} value={m.id}>{m.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        proj.pic_marketing_name || '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {editingProjectId === proj.id ? (
                                                        <input type="date" className="modern-input" value={editProjectStartDate}
                                                            onChange={(e) => setEditProjectStartDate(e.target.value)}
                                                            style={{ width: '130px' }}
                                                        />
                                                    ) : (
                                                        proj.baseline_start_date ? proj.baseline_start_date.split('T')[0] : '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {editingProjectId === proj.id ? (
                                                        <select className="modern-select" value={editProductType} onChange={(e) => setEditProductType(e.target.value)} style={{ width: '130px', padding: '4px' }}>
                                                            <option value="">-- Pilih --</option>
                                                            {productTypes.map(m => (
                                                                <option key={m.id} value={m.id}>{m.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        proj.product_type_name || '-'
                                                    )}
                                                </td>
                                                <td style={{ fontWeight: '500' }}>
                                                    {editingProjectId === proj.id ? (
                                                        <input type="text" className="modern-input" value={editProjectValue}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                                setEditProjectValue(val ? new Intl.NumberFormat('id-ID').format(val) : '');
                                                            }}
                                                            style={{ width: '100px' }}
                                                        />
                                                    ) : (
                                                        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(proj.project_value || 0)
                                                    )}
                                                </td>
                                                <td>
                                                    {editingProjectId === proj.id ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <select className="modern-select" value={editProjectStatus} onChange={(e) => setEditProjectStatus(e.target.value)} style={{ width: '130px' }}>
                                                                {projectStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                            </select>
                                                            {(editProjectStatus === 'Complete' || editProjectStatus === 'Completed' || editProjectStatus === 'Go Live' || editProjectStatus === 'Golive') && (
                                                                <input type="date" className="modern-input" value={editProjectActualEndDate} onChange={(e) => setEditProjectActualEndDate(e.target.value)} title="Tanggal Selesai / Go Live (Actual End Date)" style={{ width: '130px', padding: '4px' }} />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                            <span className={`modern-badge badge-${proj.status === 'Planning' ? 'planning' : 'success'}`}>
                                                                {proj.status}
                                                            </span>
                                                            {(proj.status === 'Complete' || proj.status === 'Completed' || proj.status === 'Go Live' || proj.status === 'Golive') && proj.actual_end_date && (
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                    {proj.actual_end_date.split('T')[0]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {editingProjectId === proj.id ? (
                                                        <input type="text" className="modern-input" value={editProjectProgress} onChange={(e) => setEditProjectProgress(e.target.value)} style={{ width: '80px' }} />
                                                    ) : (
                                                        proj.progress || '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {editingProjectId === proj.id ? (
                                                        <input type="text" className="modern-input" value={editProjectIssues} onChange={(e) => setEditProjectIssues(e.target.value)} style={{ width: '120px' }} />
                                                    ) : (
                                                        proj.issues || '-'
                                                    )}
                                                </td>
                                                <td style={{ color: 'var(--secondary-500)' }}>
                                                    {editingProjectId === proj.id ? (
                                                        <input type="date" className="modern-input" value={editProjectGolive} onChange={(e) => setEditProjectGolive(e.target.value)} />
                                                    ) : (
                                                        proj.baseline_end_date ? proj.baseline_end_date.split('T')[0] : '-'
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                                                        {proj.last_updated_at ? new Date(proj.last_updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                        {proj.last_updated_by ? `Oleh ${proj.last_updated_by}` : '-'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        {editingProjectId === proj.id ? (
                                                            <>
                                                                <button onClick={() => saveEditProject(proj.id)} className="modern-btn modern-btn-primary" style={{ padding: '6px 12px' }}>Simpan</button>
                                                                <button onClick={cancelEditProject} className="modern-btn" style={{ padding: '6px 12px', background: '#f8d7da', color: '#721c24' }}>Batal</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => setActiveProject(proj)} className="modern-btn modern-btn-secondary">
                                                                    Detail WBS
                                                                </button>
                                                                <button onClick={() => startEditProject(proj)} className="modern-btn" style={{ padding: '6px 12px', background: '#e2e8f0', color: '#1e293b' }} title="Edit Project">
                                                                    ✏️
                                                                </button>
                                                                {currentUser.role === 'Admin' && (
                                                                    <button onClick={() => handleDeleteProject(proj.id, proj.project_name)} className="modern-btn modern-btn-danger" style={{ padding: '6px 10px', backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }} title="Hapus Project">
                                                                        🗑️
                                                                    </button>
                                                                )}
                                                                <button onClick={() => { setUploadingBastId(proj.id); bastFileInputRef.current.click(); }} className="modern-btn" style={{ padding: '6px 10px', background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }} title={proj.bast_file ? "Re-upload BAST" : "Upload BAST"}>
                                                                    {proj.bast_file ? "🔄 BAST" : "📤 BAST"}
                                                                </button>
                                                                {proj.bast_file && (
                                                                    <button onClick={() => { setSelectedBastUrl(`${API_URL}/${proj.bast_file}`); setShowBastModal(true); }} className="modern-btn" style={{ padding: '6px 10px', background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }} title="Lihat BAST">
                                                                        👁️ BAST
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!Array.isArray(projects) || projects.length === 0) && (
                                            <tr>
                                                <td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                                    Belum ada project yang ditambahkan.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px 0', borderTop: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                                        Menampilkan {indexOfFirstProject + 1} - {Math.min(indexOfLastProject, filteredProjects.length)} dari {filteredProjects.length} project
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="modern-btn"
                                            style={{ padding: '6px 12px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                        >
                                            Sebelumnya
                                        </button>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            {[...Array(totalPages)].map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentPage(idx + 1)}
                                                    style={{
                                                        width: '32px', height: '32px', borderRadius: '6px', border: 'none',
                                                        backgroundColor: currentPage === idx + 1 ? 'var(--primary-500)' : '#f1f5f9',
                                                        color: currentPage === idx + 1 ? 'white' : '#475569',
                                                        fontWeight: currentPage === idx + 1 ? '600' : '400',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {idx + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="modern-btn"
                                            style={{ padding: '6px 12px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                        >
                                            Selanjutnya
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                ) : (
                    <p style={{ color: '#dc2626' }}>Anda tidak memiliki akses ke modul manapun. Hubungi Admin untuk meminta akses.</p>
                )}
                
                {/* Hidden File Input for BAST */}
                <input 
                    type="file" 
                    accept="application/pdf" 
                    ref={bastFileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleBastFileSelect} 
                />

                {/* Modal Preview BAST */}
                {showBastModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                        <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Preview Dokumen BAST</h3>
                                <button onClick={() => { setShowBastModal(false); setSelectedBastUrl(''); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                            </div>
                            <div style={{ flex: 1, padding: '0' }}>
                                <embed src={selectedBastUrl} type="application/pdf" width="100%" height="100%" />
                            </div>
                        </div>
                    </div>
                )}
                
            </div>
        </div>
    );
}

export default App;
