import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, CheckCircle2, X, ListTodo, CheckCircle, Clock, Filter } from 'lucide-react';
import { API_URL } from '../App';

export default function SerahTerimaDokumen() {
    const [handovers, setHandovers] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [teamUsers, setTeamUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });
    
    // Pagination and Filter state
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPeriod, setFilterPeriod] = useState(''); // YYYY-MM
    const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
    const itemsPerPage = 10;
    
    // Form state
    const [formData, setFormData] = useState({
        document_id: '',
        nama_dokumen: '',
        sender_id: '',
        receiver_id: '',
        catatan: ''
    });

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [handRes, docRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/api/handovers`),
                fetch(`${API_URL}/api/document-tracking`),
                fetch(`${API_URL}/api/users`)
            ]);
            
            if (handRes.ok) setHandovers(await handRes.json());
            if (docRes.ok) setDocuments(await docRes.json());
            if (usersRes.ok) {
                const users = await usersRes.json();
                setTeamUsers(users.filter(u => u.is_active));
            }
        } catch (e) {
            console.error('Fetch error:', e);
            showToast('Gagal mengambil data dari server.', 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = () => {
        setFormData({ document_id: '', nama_dokumen: '', sender_id: '', receiver_id: '', catatan: '' });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleSubmit = async () => {
        if (!formData.document_id || !formData.nama_dokumen || !formData.sender_id || !formData.receiver_id) {
            showToast('Harap lengkapi field yang wajib (Pengajuan, Dokumen, Pengirim, Penerima).', 'error');
            return;
        }
        if (formData.sender_id === formData.receiver_id) {
            showToast('Pengirim dan Penerima tidak boleh sama.', 'error');
            return;
        }
        
        try {
            const res = await fetch(`${API_URL}/api/handovers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Serah terima berhasil dicatat.');
                setShowModal(false);
                fetchData();
            } else {
                showToast(data.error || 'Gagal mencatat serah terima.', 'error');
            }
        } catch (e) {
            showToast('Terjadi kesalahan koneksi.', 'error');
        }
    };

    const handleReceive = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/handovers/${id}/receive`, {
                method: 'PUT'
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Dokumen berhasil dikonfirmasi diterima.');
                setHandovers(prev => prev.map(h => h.id === id ? { ...h, status: 'DITERIMA', tanggal_diterima: data.data?.tanggal_diterima || new Date().toISOString() } : h));
            } else {
                showToast(data.error || 'Gagal mengonfirmasi.', 'error');
            }
        } catch (e) {
            showToast('Terjadi kesalahan koneksi.', 'error');
        }
    };

    // Filter Logic
    const filteredData = handovers.filter(item => {
        // Search filter
        let matchSearch = true;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            matchSearch = (item.nama_dokumen || '').toLowerCase().includes(q) ||
               (item.no_pengajuan || '').toLowerCase().includes(q) ||
               (item.sender_name || '').toLowerCase().includes(q) ||
               (item.receiver_name || '').toLowerCase().includes(q) ||
               (item.catatan || '').toLowerCase().includes(q);
        }

        // Status filter
        let matchStatus = true;
        if (filterStatus) {
            matchStatus = item.status === filterStatus;
        }

        // Date/Period filter
        let matchPeriod = true;
        if (filterPeriod || filterDate) {
            const actionDate = item.tanggal_diterima ? item.tanggal_diterima : item.tanggal_diberikan;
            if (!actionDate) matchPeriod = false;
            else {
                // filterDate (specific day)
                if (filterDate) {
                    matchPeriod = actionDate.startsWith(filterDate);
                } 
                // filterPeriod (month-year)
                else if (filterPeriod) {
                    matchPeriod = actionDate.startsWith(filterPeriod);
                }
            }
        }

        return matchSearch && matchStatus && matchPeriod;
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // KPI Calculations
    const totalHandovers = handovers.length;
    const pendingHandovers = handovers.filter(h => h.status === 'DIBERIKAN').length;
    const completedHandovers = handovers.filter(h => h.status === 'DITERIMA').length;

    return (
        <div style={{ padding: '30px', fontFamily: 'Inter, sans-serif', color: '#0f172a' }}>
            {toast.message && (
                <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '14px 24px', borderRadius: '8px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', fontSize: '15px', fontWeight: '500', animation: 'slideDown 0.3s ease-out' }}>
                    <style>{`@keyframes slideDown { from { top: -50px; opacity: 0; } to { top: 24px; opacity: 1; } }`}</style>
                    {toast.type === 'success' ? <CheckCircle size={22} /> : <X size={22} />}
                    <span>{toast.message}</span>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ListTodo size={28} color="#3b82f6" />
                        Serah Terima Dokumen (Handover)
                    </h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Kelola dan pantau seluruh catatan serah terima dokumen fisik antar PIC secara terpusat.</p>
                </div>
                <button onClick={handleOpenModal} style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#1e293b'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#0f172a'}>
                    <Plus size={18} /> Tambah Serah Terima
                </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>TOTAL SERAH TERIMA</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{totalHandovers}</div>
                    </div>
                </div>
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>PROSES (DIBERIKAN)</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{pendingHandovers}</div>
                    </div>
                </div>
                <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#dcfce3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>SELESAI (DITERIMA)</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{completedHandovers}</div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '9px', color: '#94a3b8' }} size={18} />
                    <input type="text" placeholder="Cari dokumen, PIC, atau catatan..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} style={{ width: '100%', padding: '9px 12px 9px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} color="#64748b" />
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Filter:</label>
                </div>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '500' }}>
                    <option value="">Semua Status</option>
                    <option value="DIBERIKAN">DIBERIKAN</option>
                    <option value="DITERIMA">DITERIMA</option>
                </select>
                
                <input 
                    type="month" 
                    title="Bulan & Tahun"
                    value={filterPeriod} 
                    onChange={(e) => { 
                        setFilterPeriod(e.target.value); 
                        if(e.target.value) setFilterDate(''); // Clear specific date if month selected
                        setCurrentPage(1); 
                    }} 
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a' }} 
                />

                <input 
                    type="date" 
                    title="Tanggal Spesifik"
                    value={filterDate} 
                    onChange={(e) => { 
                        setFilterDate(e.target.value); 
                        if(e.target.value) setFilterPeriod(''); // Clear month if specific date selected
                        setCurrentPage(1); 
                    }} 
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a' }} 
                />

                {(filterStatus || filterPeriod || filterDate || searchQuery) && (
                    <button 
                        onClick={() => {
                            setFilterStatus('');
                            setFilterPeriod('');
                            setFilterDate('');
                            setSearchQuery('');
                            setCurrentPage(1);
                        }}
                        style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <X size={16} /> Reset
                    </button>
                )}
            </div>

            {/* Main Table */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '16px 20px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>Detail Dokumen Fisik</th>
                            <th style={{ padding: '16px 20px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>Terkait Pengajuan</th>
                            <th style={{ padding: '16px 20px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>Diserahkan Oleh</th>
                            <th style={{ padding: '16px 20px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>Diterima Oleh</th>
                            <th style={{ padding: '16px 20px', color: '#475569', fontWeight: '600', fontSize: '13px' }}>Status Log</th>
                            <th style={{ padding: '16px 20px', color: '#475569', fontWeight: '600', fontSize: '13px', textAlign: 'right' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Memuat data serah terima...</td></tr>
                        ) : filteredData.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto', display: 'block' }} />
                                Tidak ada log serah terima dokumen ditemukan berdasarkan filter saat ini.
                            </td></tr>
                        ) : (
                            paginatedData.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#f8fafc'} onMouseOut={e=>e.currentTarget.style.backgroundColor='transparent'}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{item.nama_dokumen}</div>
                                        {item.catatan && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>📝 {item.catatan}</div>}
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '13px' }}>{item.no_pengajuan || '-'}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ color: '#334155', fontWeight: '500', fontSize: '14px' }}>{item.sender_name}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ color: '#334155', fontWeight: '500', fontSize: '14px' }}>{item.receiver_name}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        {item.status === 'DIBERIKAN' ? (
                                            <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginBottom: '6px' }}>DIBERIKAN</span>
                                        ) : (
                                            <span style={{ backgroundColor: '#dcfce3', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginBottom: '6px' }}>DITERIMA</span>
                                        )}
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                            Beri: {new Date(item.tanggal_diberikan).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>
                                        {item.tanggal_diterima && (
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                Terima: {new Date(item.tanggal_diterima).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        {item.status === 'DIBERIKAN' && (
                                            <button onClick={() => handleReceive(item.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'transform 0.1s, background-color 0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#059669'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#10b981'} onMouseDown={e=>e.currentTarget.style.transform='scale(0.97)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
                                                <CheckCircle2 size={14} /> Konfirmasi Diterima
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                            Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} style={{ padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: currentPage === 1 ? '#f1f5f9' : '#ffffff', color: currentPage === 1 ? '#94a3b8' : '#475569', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500' }}>
                                Sebelumnya
                            </button>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} style={{ padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#ffffff', color: currentPage === totalPages ? '#94a3b8' : '#475569', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500' }}>
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah Serah Terima */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={20} color="#3b82f6" /> Tambah Log Serah Terima Baru
                            </h2>
                            <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}><X size={20} /></button>
                        </div>
                        
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Terkait Pengajuan (Document Tracking)</label>
                                    <select style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc' }} value={formData.document_id} onChange={(e) => setFormData({...formData, document_id: e.target.value})}>
                                        <option value="">-- Pilih Nomor Pengajuan Dokumen --</option>
                                        {documents.map(d => <option key={d.id} value={d.id}>{d.no_pengajuan || `[Tanpa Nomor]`} - {d.nama_project || '-'}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Nama / Deskripsi Dokumen Fisik</label>
                                    <input type="text" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} value={formData.nama_dokumen} onChange={(e) => setFormData({...formData, nama_dokumen: e.target.value})} placeholder="Contoh: BAST Asli Tahap 1, Invoice Asli..." />
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Diserahkan Oleh</label>
                                        <select style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc' }} value={formData.sender_id} onChange={(e) => setFormData({...formData, sender_id: e.target.value})}>
                                            <option value="">-- Pilih PIC Pengirim --</option>
                                            {teamUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Diterima Oleh</label>
                                        <select style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc' }} value={formData.receiver_id} onChange={(e) => setFormData({...formData, receiver_id: e.target.value})}>
                                            <option value="">-- Pilih PIC Penerima --</option>
                                            {teamUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Catatan Tambahan (Opsional)</label>
                                    <textarea style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', minHeight: '80px', outline: 'none', resize: 'vertical' }} value={formData.catatan} onChange={(e) => setFormData({...formData, catatan: e.target.value})} placeholder="Misal: Dokumen dalam map merah..." />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc', borderRadius: '0 0 16px 16px' }}>
                            <button onClick={handleCloseModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>Batal</button>
                            <button onClick={handleSubmit} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(59,130,246,0.3)' }}>
                                Proses Serah Terima
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
