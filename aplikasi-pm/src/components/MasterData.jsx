import React, { useState, useEffect } from 'react';

const API_URL = '';

// ---------- MODUL MASTER DATA ----------
export default function MasterDataModule({ currentUser, TeamManagementComponent }) {
    const [activeTab, setActiveTab] = useState('JENIS_PRODUK');
    const [data, setData] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_URL}/api/master-data?type=${activeTab}`);
            setData(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchData(); }, [activeTab]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItemName) return;
        try {
            await fetch(`${API_URL}/api/master-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: activeTab, name: newItemName })
            });
            setNewItemName('');
            fetchData();
        } catch (e) { console.error(e); }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await fetch(`${API_URL}/api/master-data/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            fetchData();
        } catch (e) { console.error(e); }
    };

    const handleEditSave = async (id) => {
        try {
            await fetch(`${API_URL}/api/master-data/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingName })
            });
            setEditingId(null);
            fetchData();
        } catch (e) { console.error(e); }
    };

    return (
        <div>
            <header style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>Modul Master Data</h1>
                <p style={{ color: '#64748b' }}>Kelola referensi data yang digunakan pada aplikasi.</p>
            </header>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                {/* PERBAIKAN 1 & 2: Tambah koma setelah 'NAMA_VENDOR' dan perbaiki struktur ternary teks tombol */}
                {['JENIS_PRODUK', 'STATUS_Project', 'MARKETING', 'NAMA_VENDOR', 'ROLE', ...(currentUser?.role === 'Admin' ? ['MANAJEMEN_TIM'] : [])].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', border: 'none', backgroundColor: activeTab === tab ? '#38bdf8' : '#e2e8f0', color: activeTab === tab ? '#fff' : '#475569' }}>
                        {tab === 'JENIS_PRODUK' ? 'Jenis Produk Project' : tab === 'STATUS_Project' ? 'Status Project' : tab === 'MARKETING' ? 'PIC Marketing' : tab === 'NAMA_VENDOR' ? 'Nama Vendor' : tab === 'ROLE' ? 'Role Pengguna' : 'Manajemen Tim'}
                    </button>
                ))}
            </div>

            {activeTab === 'MANAJEMEN_TIM' ? (
                <TeamManagementComponent currentUser={currentUser} hideHeader={true} />
            ) : (
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        {/* PERBAIKAN 3: Memperbaiki tanda kutip dan penamaan kondisi di placeholder */}
                        <input 
                            type="text" 
                            placeholder={`Tambah ${activeTab === 'JENIS_PRODUK' ? 'Jenis Produk' : activeTab === 'MARKETING' ? 'PIC Marketing' : activeTab === 'NAMA_VENDOR' ? 'Nama Vendor' : activeTab === 'ROLE' ? 'Role' : 'Status'} Baru...`} 
                            value={newItemName} 
                            onChange={e => setNewItemName(e.target.value)} 
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                        />
                        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Tambah</button>
                    </form>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px' }}>
                                <th style={{ padding: '10px' }}>Nama Referensi</th>
                                <th style={{ padding: '10px' }}>Status</th>
                                <th style={{ padding: '10px' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                                    <td style={{ padding: '10px' }}>
                                        {editingId === item.id ? (
                                            <input 
                                                type="text" 
                                                value={editingName} 
                                                onChange={e => setEditingName(e.target.value)} 
                                                style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%' }}
                                            />
                                        ) : (
                                            item.name
                                        )}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{ backgroundColor: item.is_active ? '#dcfce7' : '#fee2e2', color: item.is_active ? '#16a34a' : '#dc2626', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                                        {editingId === item.id ? (
                                            <>
                                                <button onClick={() => handleEditSave(item.id)} style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', border: 'none', backgroundColor: '#16a34a', color: 'white', fontSize: '12px' }}>Simpan</button>
                                                <button onClick={() => setEditingId(null)} style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '12px' }}>Batal</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditingId(item.id); setEditingName(item.name); }} style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '12px' }}>Edit</button>
                                                <button onClick={() => toggleStatus(item.id, item.is_active)} style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '12px' }}>
                                                    {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Belum ada data.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}