import React, { useState, useEffect } from 'react';
import { Users, Trash2, Plus, KeyRound, ShieldCheck, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
    Admin: { bg: '#fee2e2', text: '#991b1b' },
    ProjectManager: { bg: '#e0e7ff', text: '#3730a3' },
    TeamMember: { bg: '#f3f4f6', text: '#4b5563' }
};

function getInitials(name) {
    if (!name) return 'UN';
    const words = name.split(' ');
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

function TeamManagement({ currentUser, hideHeader = false }) {
    const [users, setUsers] = useState([]);
    const [fullName, setFullName] = useState('');
    const [nik, setNik] = useState('');
    const [jabatan, setJabatan] = useState('');
    const [role, setRole] = useState('TeamMember');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [newPermissions, setNewPermissions] = useState(['summary', 'dashboard']);
    const [formError, setFormError] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editNik, setEditNik] = useState('');
    const [editJabatan, setEditJabatan] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editUsername, setEditUsername] = useState('');

    const [accessPanelId, setAccessPanelId] = useState(null);
    const [tempPermissions, setTempPermissions] = useState([]);

    const [resetPasswordUser, setResetPasswordUser] = useState(null);
    const [newPasswordInput, setNewPasswordInput] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('Semua');
    const [filterStatus, setFilterStatus] = useState('Semua');

    const [rolesList, setRolesList] = useState(['Admin', 'ProjectManager', 'TeamMember']);

    useEffect(() => { 
        fetchUsers(); 
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await fetch(`${API_URL}/api/master-data?type=ROLE`);
            if (res.ok) {
                const data = await res.json();
                const dbRoles = data.map(r => r.name);
                setRolesList([...new Set(['Admin', 'ProjectManager', 'TeamMember', ...dbRoles])]);
            }
        } catch (err) { console.error(err); }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`);
            setUsers(await response.json());
        } catch (err) { console.error(err); }
    };

    const passwordStrong = (pw) => pw && pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);

    const toggleNewPermission = (key) => {
        setNewPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!fullName || !username || !password) {
            setFormError('Nama, username, dan password wajib diisi.');
            return;
        }
        if (!passwordStrong(password)) {
            setFormError('Password minimal 8 karakter dan harus mengandung huruf serta angka.');
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: fullName, nik, jabatan, role, username, password, permissions: newPermissions })
            });
            const data = await response.json();
            if (response.ok) {
                setFullName(''); setNik(''); setJabatan(''); setUsername(''); setPassword(''); setNewPermissions(['summary', 'dashboard']);
                fetchUsers();
            } else {
                setFormError(data.message || 'Gagal menambah user. Kemungkinan username sudah dipakai.');
            }
        } catch (err) { console.error(err); }
    };

    const startEdit = (u) => { setEditingId(u.id); setEditName(u.full_name); setEditNik(u.nik || ''); setEditJabatan(u.jabatan || ''); setEditRole(u.role); setEditUsername(u.username || ''); };
    const cancelEdit = () => setEditingId(null);

    const saveEdit = async (u) => {
        try {
            const res = await fetch(`${API_URL}/api/users/${u.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: editName, nik: editNik, jabatan: editJabatan, role: editRole, permissions: u.permissions, username: editUsername || null })
            });
            if (res.ok) {
                setEditingId(null);
                fetchUsers();
            } else {
                const text = await res.text();
                alert(text);
            }
        } catch (err) { console.error(err); alert("Terjadi kesalahan."); }
    };

    const toggleActive = async (u) => {
        await fetch(`${API_URL}/api/users/${u.id}/status`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !u.is_active })
        });
        fetchUsers();
    };

    const openResetPasswordModal = (u) => {
        setResetPasswordUser(u);
        setNewPasswordInput('');
    };

    const confirmResetPassword = async () => {
        if (!passwordStrong(newPasswordInput)) {
            alert('Password minimal 8 karakter dan kombinasi huruf serta angka.');
            return;
        }
        const response = await fetch(`${API_URL}/api/users/${resetPasswordUser.id}/password`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPasswordInput })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Password berhasil direset.');
            setResetPasswordUser(null);
            setNewPasswordInput('');
        } else {
            alert(data.message || 'Gagal mereset password.');
        }
    };

    const openAccessPanel = (u) => {
        setAccessPanelId(u.id);
        let perms = u.permissions || [];
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) { }
            if (typeof perms === 'string') {
                try { perms = JSON.parse(perms); } catch (e) { }
            }
        }
        setTempPermissions(Array.isArray(perms) ? perms : []);
    };

    const toggleTempPermission = (key) => {
        setTempPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
    };

    const saveAccess = async (u) => {
        await fetch(`${API_URL}/api/users/${u.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: u.full_name, role: u.role, permissions: tempPermissions })
        });
        setAccessPanelId(null);
        fetchUsers();
    };

    if (currentUser?.role !== 'Admin') {
        return <p style={{ color: '#dc2626' }}>Anda tidak memiliki akses ke halaman ini.</p>;
    }

    const filteredUsers = users.filter(u => {
        const matchRole = filterRole === 'Semua' || u.role === filterRole;
        const matchStatus = filterStatus === 'Semua' || (filterStatus === 'Aktif' ? u.is_active : !u.is_active);
        const matchSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchRole && matchStatus && matchSearch;
    });

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {!hideHeader && (
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users color="#2563eb" /> Manajemen Tim
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Kelola akses, role, dan akun pengguna sistem.</p>
                </div>
            )}

            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px', border: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                    <Plus size={18} color="#2563eb" /> Tambah Pengguna Baru
                </h3>
                <form onSubmit={handleAddUser}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        <input type="text" placeholder="Nama Lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <input type="text" placeholder="NIK (Opsional)" value={nik} onChange={(e) => setNik(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <input type="text" placeholder="Jabatan (Opsional)" value={jabatan} onChange={(e) => setJabatan(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <input type="text" placeholder="ID Login (username)" value={username} onChange={(e) => setUsername(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <input type="password" placeholder="Password (min. 8 karakter)" value={password} onChange={(e) => setPassword(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>

                    {role !== 'Admin' && (
                        <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Akses Modul Awal:</p>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {MODULE_LIST.map(m => (
                                    <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #e2e8f0' }}>
                                        <input type="checkbox" checked={newPermissions.includes(m.key)} onChange={() => toggleNewPermission(m.key)} />
                                        {m.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <p style={{ fontSize: '11px', color: passwordStrong(password) || !password ? '#94a3b8' : '#dc2626', marginBottom: '10px' }}>
                        Password wajib minimal 8 karakter, kombinasi huruf & angka (sesuai kebijakan keamanan data).
                    </p>

                    {formError && <p style={{ color: '#dc2626', fontSize: '12px', marginBottom: '10px' }}>{formError}</p>}

                    <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                        + Tambah Anggota
                    </button>
                </form>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text" placeholder="Cari nama atau ID login..."
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box', fontSize: '13px' }}
                    />
                </div>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    <option value="Semua">Semua Role</option>
                    {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    <option value="Semua">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                </select>
            </div>

            <div className="table-responsive" style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            <th style={{ padding: '12px 16px' }}>Anggota</th>
                            <th style={{ padding: '12px 16px' }}>NIK</th>
                            <th style={{ padding: '12px 16px' }}>Jabatan</th>
                            <th style={{ padding: '12px 16px' }}>ID Login</th>
                            <th style={{ padding: '12px 16px' }}>Role</th>
                            <th style={{ padding: '12px 16px' }}>Akses Modul</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((u) => {
                            const colors = ROLE_COLORS[u.role] || { bg: '#f1f5f9', text: '#334155' };
                            return (
                                <React.Fragment key={u.id}>
                                    <tr style={{ borderTop: '1px solid #f1f5f9', fontSize: '14px', opacity: u.is_active ? 1 : 0.55 }}>
                                        <td style={{ padding: '14px 16px' }}>
                                            {editingId === u.id ? (
                                                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '140px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: colors.bg, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                                        {getInitials(u.full_name)}
                                                    </div>
                                                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{u.full_name}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {editingId === u.id ? (
                                                <input value={editNik} onChange={(e) => setEditNik(e.target.value)} placeholder="NIK" style={{ width: '100px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            ) : (
                                                <span style={{ fontSize: '13px', color: '#475569' }}>{u.nik || '-'}</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {editingId === u.id ? (
                                                <input value={editJabatan} onChange={(e) => setEditJabatan(e.target.value)} placeholder="Jabatan" style={{ width: '120px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            ) : (
                                                <span style={{ fontSize: '13px', color: '#475569' }}>{u.jabatan || '-'}</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {editingId === u.id ? (
                                                <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username" style={{ width: '100px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            ) : (
                                                <code style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                                    {u.username || '-'}
                                                </code>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {editingId === u.id ? (
                                                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                    {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            ) : (
                                                <span style={{ backgroundColor: colors.bg, color: colors.text, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                                                    {u.role}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {u.role === 'Admin' ? (
                                                <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Akses penuh</span>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {MODULE_LIST.map(m => (u.permissions || []).includes(m.key) && (
                                                        <span key={m.key} style={{ fontSize: '10px', backgroundColor: '#eef2ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px' }}>{m.label}</span>
                                                    ))}
                                                    {(!u.permissions || u.permissions.length === 0) && (
                                                        <span style={{ fontSize: '11px', color: '#dc2626' }}>Tidak ada akses</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ backgroundColor: u.is_active ? '#f0fdf4' : '#fef2f2', color: u.is_active ? '#166534' : '#991b1b', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                                                {u.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {editingId === u.id ? (
                                                    <>
                                                        <button onClick={() => saveEdit(u)} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Simpan</button>
                                                        <button onClick={cancelEdit} style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Batal</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEdit(u)} title="Edit" style={{ backgroundColor: '#f1f5f9', color: '#334155', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                                                        {u.role !== 'Admin' && (
                                                            <button onClick={() => openAccessPanel(u)} title="Kelola Akses Modul" style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#eef2ff', color: '#4338ca', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                                                                <ShieldCheck size={12} /> Akses
                                                            </button>
                                                        )}
                                                        <button onClick={() => openResetPasswordModal(u)} title="Reset Password" style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                                                            <KeyRound size={12} /> Reset
                                                        </button>
                                                        <button onClick={() => toggleActive(u)} style={{ backgroundColor: u.is_active ? '#fef2f2' : '#f0fdf4', color: u.is_active ? '#991b1b' : '#166534', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
                                                            {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {accessPanelId === u.id && (
                                        <tr>
                                            <td colSpan="6" style={{ padding: 0 }}>
                                                <div style={{ backgroundColor: '#f8fafc', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                                                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>
                                                        Atur akses modul untuk {u.full_name}:
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                                        {MODULE_LIST.map(m => (
                                                            <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                                                                <input type="checkbox" checked={tempPermissions.includes(m.key)} onChange={() => toggleTempPermission(m.key)} />
                                                                {m.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button onClick={() => saveAccess(u)} style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Simpan Akses</button>
                                                        <button onClick={() => setAccessPanelId(null)} style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Tutup</button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {filteredUsers.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Tidak ada anggota tim yang cocok dengan filter.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Reset Password */}
            {resetPasswordUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#1e293b', fontWeight: 'bold' }}>Reset Password</h3>
                        <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px', lineHeight: '1.5' }}>
                            Masukkan password baru untuk <strong>{resetPasswordUser.full_name}</strong>.<br/>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>(Min. 8 karakter, kombinasi huruf & angka)</span>
                        </p>
                        <input 
                            type="text" 
                            placeholder="Ketik password baru..." 
                            value={newPasswordInput} 
                            onChange={(e) => setNewPasswordInput(e.target.value)} 
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '24px', fontSize: '14px' }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => { setResetPasswordUser(null); setNewPasswordInput(''); }} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f5f9', color: '#475569', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                                Batal
                            </button>
                            <button onClick={confirmResetPassword} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px', boxShadow: '0 2px 4px rgba(37,99,235,0.2)' }}>
                                Konfirmasi Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


export default TeamManagement;
