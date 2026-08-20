import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, UploadCloud, Filter, FileText, Check, MoreVertical, X, CheckCircle2, ChevronRight, CheckCircle, FileCheck, DollarSign, MoreHorizontal, Trash2, AlertCircle, MessageSquare, ListTodo } from 'lucide-react';
import { API_URL } from '../App';

const STEPS = ['PENGAJUAN', 'PR SUBMITTED', 'PR APPROVED', 'PO ISSUED', 'IMPLEMENTASI', 'BAST', 'COMPLETED'];

export default function DocumentTracking({ currentUser }) {
    const [documents, setDocuments] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [marketingPics, setMarketingPics] = useState([]);
    const [teamRekonUsers, setTeamRekonUsers] = useState([]);
    const [teamManagementUsers, setTeamManagementUsers] = useState([]); // All active users for handover
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showKetModal, setShowKetModal] = useState(false);
    const [ketData, setKetData] = useState({ id: null, keterangan: '' });
    const [activeTab, setActiveTab] = useState('detail');
    const [handovers, setHandovers] = useState([]);
    const [handoverForm, setHandoverForm] = useState({ nama_dokumen: '', sender_id: '', receiver_id: '', catatan: '' });
    const [handoverCurrentPage, setHandoverCurrentPage] = useState(1);
    const handoverItemsPerPage = 10;
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [formData, setFormData] = useState({});
    const [filesToUpload, setFilesToUpload] = useState({});

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [vendorFilter, setVendorFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [docRes, masterRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/api/document-tracking`),
                fetch(`${API_URL}/api/master-data`),
                fetch(`${API_URL}/api/users`)
            ]);
            if (docRes.ok) setDocuments(await docRes.json());
            if (masterRes.ok) {
                const master = await masterRes.json();
                setVendors(master.filter(m => m.type && m.type.toUpperCase() === 'NAMA_VENDOR'));
                setMarketingPics(master.filter(m => m.type && m.type.toUpperCase() === 'MARKETING'));
            }
            if (usersRes.ok) {
                const users = await usersRes.json();
                setTeamRekonUsers(users.filter(u => u.is_active && (u.role || '').toLowerCase().includes('rekon')));
                setTeamManagementUsers(users.filter(u => u.is_active));
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

    const handleOpenModal = async (doc = null) => {
        setSelectedDoc(doc);
        setActiveTab('detail');
        if (doc) {
            setFormData(doc);
            try {
                const hRes = await fetch(`${API_URL}/api/handovers/${doc.id}`);
                if (hRes.ok) {
                    setHandovers(await hRes.json());
                }
            } catch (e) {
                console.error('Error fetching handovers', e);
            }
        } else {
            setFormData({ status: 'PENGAJUAN' });
            setHandovers([]);
        }
        setHandoverForm({ nama_dokumen: '', sender_id: '', receiver_id: '', catatan: '' });
        setFilesToUpload({});
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedDoc(null);
    };

    const handleFileChange = (e, field) => {
        if (e.target.files && e.target.files[0]) {
            setFilesToUpload(prev => ({ ...prev, [field]: e.target.files[0] }));
        }
    };

    const handleSaveKeterangan = async () => {
        try {
            const res = await fetch(`${API_URL}/api/document-tracking/${ketData.id}/keterangan`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keterangan: ketData.keterangan || '' })
            });
            if (res.ok) {
                showToast('Keterangan berhasil disimpan.');
                setShowKetModal(false);
                fetchData();
            } else {
                showToast('Gagal menyimpan keterangan.', 'error');
            }
        } catch (err) {
            showToast('Terjadi kesalahan.', 'error');
        }
    };

    const handleSubmitHandover = async () => {
        if (!handoverForm.nama_dokumen || !handoverForm.sender_id || !handoverForm.receiver_id) {
            showToast('Harap lengkapi Nama Dokumen, Pengirim, dan Penerima.', 'error');
            return;
        }
        if (handoverForm.sender_id === handoverForm.receiver_id) {
            showToast('Pengirim dan Penerima tidak boleh sama.', 'error');
            return;
        }
        try {
            const res = await fetch(`${API_URL}/api/handovers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...handoverForm, document_id: selectedDoc.id })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Serah terima berhasil dicatat.');
                setHandoverForm({ nama_dokumen: '', sender_id: '', receiver_id: '', catatan: '' });
                // Re-fetch handovers
                const hRes = await fetch(`${API_URL}/api/handovers/${selectedDoc.id}`);
                if (hRes.ok) setHandovers(await hRes.json());
            } else {
                showToast(data.error || 'Gagal mencatat serah terima.', 'error');
            }
        } catch (e) {
            showToast('Terjadi kesalahan koneksi.', 'error');
        }
    };

    const handleReceiveHandover = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/handovers/${id}/receive`, {
                method: 'PUT'
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Dokumen berhasil dikonfirmasi diterima.');
                // Update optimistically or re-fetch
                setHandovers(prev => prev.map(h => h.id === id ? { ...h, status: 'DITERIMA', tanggal_diterima: data.data?.tanggal_diterima || new Date().toISOString() } : h));
            } else {
                showToast(data.error || 'Gagal mengonfirmasi.', 'error');
            }
        } catch (e) {
            showToast('Terjadi kesalahan koneksi.', 'error');
        }
    };

    const handleSave = async () => {
        // Validasi Status sebelum Submit Frontend (Mencegah Alert/Crash)
        if (formData.status === 'PO ISSUED') {
            if (!formData.pr_approved_date || (!filesToUpload.file_pr && !selectedDoc?.file_pr)) {
                showToast('Validasi Gagal: Dokumen PR & Tanggal Approve PR wajib diisi sebelum status PO ISSUED.', 'error');
                return;
            }
        }
        if (formData.status === 'IMPLEMENTASI') {
            if (!filesToUpload.file_po && !selectedDoc?.file_po) {
                showToast('Validasi Gagal: Dokumen PO wajib diisi sebelum status IMPLEMENTASI.', 'error');
                return;
            }
        }

        const url = selectedDoc 
            ? `${API_URL}/api/document-tracking/${selectedDoc.id}` 
            : `${API_URL}/api/document-tracking`;
        const method = selectedDoc ? 'PUT' : 'POST';

        const formDataObj = new FormData();
        Object.keys(formData).forEach(key => {
            if (key !== 'last_updated_by' && formData[key] !== null && formData[key] !== undefined) {
                formDataObj.append(key, formData[key]);
            }
        });
        
        // Pastikan kita merekam siapa yang terakhir mengupdate data
        formDataObj.append('last_updated_by', currentUser?.full_name || 'Administrator');

        Object.keys(filesToUpload).forEach(key => {
            formDataObj.append(key, filesToUpload[key]);
        });

        try {
            const response = await fetch(url, {
                method,
                body: formDataObj
            });
            const data = await response.json();
            if (response.ok) {
                showToast('Data berhasil disimpan!', 'success');
                handleCloseModal();
                fetchData();
            } else {
                showToast(data.error || 'Terjadi kesalahan saat memproses data.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast("Terjadi kesalahan jaringan atau server.", 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus dokumen ini?')) return;
        try {
            const response = await fetch(`${API_URL}/api/document-tracking/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Data berhasil dihapus!', 'success');
                fetchData();
            } else {
                showToast('Gagal menghapus data.', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Terjadi kesalahan jaringan.', 'error');
        }
    };

    // Calculate KPI
    const safeDocs = Array.isArray(documents) ? documents : [];
    const totalDocs = safeDocs.length;
    const pengajuan = safeDocs.filter(d => d.status === 'PENGAJUAN').length;
    const prApproved = safeDocs.filter(d => d.status === 'PR APPROVED').length;
    const poIssued = safeDocs.filter(d => d.status === 'PO ISSUED').length;
    const implementasi = safeDocs.filter(d => d.status === 'IMPLEMENTASI').length;
    const bast = safeDocs.filter(d => d.status === 'BAST' || d.status === 'COMPLETED').length;

    const filteredDocs = safeDocs.filter(d => {
        const matchesSearch = (d.no_pengajuan || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (d.kebutuhan || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (d.nama_project || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter ? d.status === statusFilter : true;
        
        // Match Vendor ID (vendor_id comes from d)
        const matchesVendor = vendorFilter ? String(d.vendor_id) === String(vendorFilter) : true;
        
        // Match Year (based on pm_date or created_at)
        const matchesYear = yearFilter ? (d.pm_date && d.pm_date.startsWith(yearFilter)) || (d.created_at && d.created_at.startsWith(yearFilter)) : true;
        
        // Match Month (based on pm_date or created_at)
        const matchesMonth = monthFilter ? (d.pm_date && d.pm_date.substring(5, 7) === monthFilter) || (d.created_at && d.created_at.substring(5, 7) === monthFilter) : true;

        return matchesSearch && matchesStatus && matchesVendor && matchesYear && matchesMonth;
    });

    // Reset pagination to page 1 whenever filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, vendorFilter, yearFilter, monthFilter]);

    // Apply pagination
    const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
    const paginatedDocs = filteredDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getStatusBadge = (status) => {
        const cls = `doc-tracking-badge badge-${(status||'pengajuan').toLowerCase().replace(/ /g, '-')}`;
        return <span className={cls}>{status}</span>;
    };

    const formatRupiah = (angka) => {
        if (!angka) return '-';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
    };

    // Helper component for Drag and Drop File Upload
    const FileUploadBox = ({ label, field }) => {
        const fileRef = useRef(null);
        const existingFileUrl = selectedDoc?.[field];
        const newFile = filesToUpload[field];

        return (
            <div className="doc-form-group">
                <label>{label}</label>
                <div 
                    className={`drag-drop-zone ${newFile ? 'active' : ''}`}
                    onClick={() => fileRef.current?.click()}
                >
                    <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={(e) => handleFileChange(e, field)} accept=".pdf,image/*" />
                    {newFile ? (
                        <div className="file-uploaded-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileCheck size={18} />
                                <span>{newFile.name}</span>
                            </div>
                            <CheckCircle2 size={16} />
                        </div>
                    ) : (
                        <>
                            <UploadCloud size={28} className="drag-drop-icon" />
                            <div className="drag-drop-text">Klik untuk mengunggah berkas</div>
                            <div className="drag-drop-subtext">Mendukung format PDF, PNG, JPG</div>
                        </>
                    )}
                </div>
                {existingFileUrl && !newFile && (
                    <div style={{ marginTop: '8px' }}>
                        <a href={`${API_URL}${existingFileUrl}`} target="_blank" rel="noreferrer" className="file-pill">
                            <FileText size={14} /> Lihat Dokumen Tersimpan
                        </a>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '30px' }}>
            {toast.message && (
                <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '14px 24px', borderRadius: '8px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', fontSize: '15px', fontWeight: '500', animation: 'slideDown 0.3s ease-out' }}>
                    {toast.type === 'success' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
                    <span>{toast.message}</span>
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideDown {
                    from { top: -50px; opacity: 0; }
                    to { top: 24px; opacity: 1; }
                }
                .btn-icon-action {
                    display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; transition: all 0.2s;
                }
                .btn-icon-action.edit { background-color: #f1f5f9; color: #3b82f6; }
                .btn-icon-action.edit:hover { background-color: #dbeafe; }
                .btn-icon-action.delete { background-color: #fef2f2; color: #ef4444; }
                .btn-icon-action.delete:hover { background-color: #fee2e2; }
            `}} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Document Tracking</h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '14px' }}>Pantau alur pengadaan dari PR, PO, hingga BAST.</p>
                </div>
                <button onClick={() => handleOpenModal()} style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.backgroundColor='#1e293b'} onMouseOut={e=>e.currentTarget.style.backgroundColor='#0f172a'}>
                    <Plus size={18} /> Pengajuan Baru
                </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Dokumen', val: totalDocs, color: '#3b82f6' },
                    { label: 'Pengajuan', val: pengajuan, color: '#475569' },
                    { label: 'PR Approved', val: prApproved, color: '#15803d' },
                    { label: 'PO Issued', val: poIssued, color: '#1d4ed8' },
                    { label: 'Implementasi', val: implementasi, color: '#a21caf' },
                    { label: 'Selesai / BAST', val: bast, color: '#047857' },
                ].map((kpi, i) => (
                    <div key={i} className="doc-card" style={{ padding: '20px', marginBottom: 0 }}>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>{kpi.label}</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: kpi.color }}>{kpi.val}</div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="doc-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center', padding: '16px 20px' }}>
                <div style={{ flex: '1 1 auto', minWidth: '250px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" placeholder="Cari no pengajuan, project, atau kebutuhan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 16px 10px 44px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box', fontSize: '14px', color: '#0f172a' }} />
                </div>
                <div style={{ flex: '0 0 auto' }}>
                    <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: '#fff', color: '#334155', fontWeight: '500', cursor: 'pointer', fontSize: '14px', minWidth: '150px' }}>
                        <option value="">Semua Vendor</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div style={{ flex: '0 0 auto' }}>
                    <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: '#fff', color: '#334155', fontWeight: '500', cursor: 'pointer', fontSize: '14px', minWidth: '120px' }}>
                        <option value="">Semua Tahun</option>
                        {/* Generate years from 2024 to current year + 2 */}
                        {Array.from({length: 5}, (_, i) => 2024 + i).map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: '0 0 auto' }}>
                    <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: '#fff', color: '#334155', fontWeight: '500', cursor: 'pointer', fontSize: '14px', minWidth: '130px' }}>
                        <option value="">Semua Bulan</option>
                        <option value="01">Januari</option>
                        <option value="02">Februari</option>
                        <option value="03">Maret</option>
                        <option value="04">April</option>
                        <option value="05">Mei</option>
                        <option value="06">Juni</option>
                        <option value="07">Juli</option>
                        <option value="08">Agustus</option>
                        <option value="09">September</option>
                        <option value="10">Oktober</option>
                        <option value="11">November</option>
                        <option value="12">Desember</option>
                    </select>
                </div>
                <div style={{ flex: '0 0 auto' }}>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', backgroundColor: '#fff', color: '#334155', fontWeight: '500', cursor: 'pointer', fontSize: '14px', minWidth: '150px' }}>
                        <option value="">Semua Status</option>
                        {STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="doc-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Detail Pengajuan</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Kebutuhan</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Vendor & Nilai PO</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Status</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Pembaruan Terakhir</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Keterangan</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center' }}>Loading...</td></tr> :
                             filteredDocs.length === 0 ? <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Tidak ada data dokumen ditemukan.</td></tr> :
                             paginatedDocs.map((doc) => (
                                <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{doc.no_pengajuan || '-'}</div>
                                        <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b', marginTop: '2px' }}>{doc.nama_project || 'Tanpa Nama Project'}</div>
                                        <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#94a3b8', marginTop: '4px' }}>
                                            Tgl: {doc.pm_date ? new Date(doc.pm_date).toLocaleDateString('id-ID') : '-'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontSize: '13px', color: '#334155', maxWidth: '250px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.kebutuhan}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{doc.vendor_name || '-'}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{formatRupiah(doc.nilai_final || doc.nilai_estimasi)}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>{getStatusBadge(doc.status)}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                                            {doc.last_updated_at ? new Date(doc.last_updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Oleh {doc.last_updated_by || '-'}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontSize: '13px', color: '#334155', maxWidth: '200px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.keterangan || '-'}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            <button className="btn-icon-action" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }} onClick={() => { setKetData({ id: doc.id, keterangan: doc.keterangan || '' }); setShowKetModal(true); }} title="Edit Keterangan">
                                                <MessageSquare size={16} />
                                            </button>
                                            <button className="btn-icon-action edit" onClick={() => handleOpenModal(doc)} title="Lihat Detail / Edit">
                                                <FileText size={16} />
                                            </button>
                                            <button className="btn-icon-action delete" onClick={() => handleDelete(doc.id)} title="Hapus Dokumen">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                Menampilkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, filteredDocs.length)} dari {filteredDocs.length} dokumen
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: currentPage === 1 ? '#f8fafc' : '#ffffff', color: currentPage === 1 ? '#cbd5e1' : '#475569', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}>
                                    Sebelumnya
                                </button>
                                <button 
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: currentPage === totalPages ? '#f8fafc' : '#ffffff', color: currentPage === totalPages ? '#cbd5e1' : '#475569', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}>
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* DETAIL MODAL (PRO MAX CARDS LAYOUT) */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                        
                        {/* Header Modal */}
                        <div style={{ padding: '24px 32px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                            <div>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#0f172a' }}>{selectedDoc ? `Detail Pengajuan: ${selectedDoc.no_pengajuan || '-'}` : 'Pengajuan Dokumen Baru'}</h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Silakan lengkapi formulir dan unggah dokumen operasional.</p>
                            </div>
                            <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                        </div>

                        <div style={{ padding: '32px' }}>
                            {/* Stepper Audit Trail */}
                            {selectedDoc && (
                                <div className="audit-stepper">
                                    {[
                                        { key: 'PENGAJUAN', label: 'PM Request', dateField: 'pm_date', picField: 'pm_pic' },
                                        { key: 'PR SUBMITTED', label: 'PR Submitted', dateField: 'pr_submitted_date', picField: 'pr_pic' },
                                        { key: 'PR APPROVED', label: 'PR Approved', dateField: 'pr_approved_date', picField: 'pr_pic' },
                                        { key: 'PO ISSUED', label: 'PO Issued', dateField: 'po_date', picField: 'po_pic' },
                                        { key: 'IMPLEMENTASI', label: 'Implementasi', dateField: 'implementasi_date', picField: '' },
                                        { key: 'BAST', label: 'BAST', dateField: 'bast_date', picField: '' },
                                        { key: 'COMPLETED', label: 'Completed', dateField: 'completed_date', picField: '' }
                                    ].map((cfg, idx) => {
                                        const currIdx = STEPS.indexOf(selectedDoc.status);
                                        const isCompleted = idx < currIdx || (currIdx === 6 && idx === 6);
                                        const isActive = idx === currIdx;
                                        const docDate = selectedDoc[cfg.dateField];
                                        const docPic = selectedDoc[cfg.picField];

                                        return (
                                            <div key={cfg.key} className={`audit-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                                <div className={`audit-line ${isCompleted ? 'active' : ''}`}></div>
                                                <div className="audit-circle">{isCompleted ? <Check size={16} /> : idx + 1}</div>
                                                <div className="audit-title">{cfg.label}</div>
                                                {docPic && <div className="audit-pic">Oleh {docPic}</div>}
                                                {docDate && <div className="audit-date">{new Date(docDate).toLocaleDateString('id-ID')}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Forms in Card Layout */}
                            
                            {/* Kartu 1: Pengajuan PM */}
                            <div className="doc-card">
                                <div className="doc-card-title"><FileText size={18} color="#3b82f6"/> 1. Detail Pengajuan (PM Request)</div>
                                <div className="dashboard-grid-2-equal">
                                    <div>
                                        <div className="doc-form-group">
                                            <label>No. Pengajuan</label>
                                            <input type="text" className="doc-input" value={formData.no_pengajuan || ''} onChange={(e) => setFormData({...formData, no_pengajuan: e.target.value})} placeholder="Contoh: PM/2026/08/001" />
                                        </div>
                                        <div className="doc-form-group">
                                            <label>Nama Project</label>
                                            <input type="text" className="doc-input" value={formData.nama_project || ''} onChange={(e) => setFormData({...formData, nama_project: e.target.value})} placeholder="Contoh: Pengembangan SIMRS" />
                                        </div>
                                        <div className="doc-form-group">
                                            <label>Kebutuhan (Deskripsi Singkat)</label>
                                            <textarea className="doc-input" style={{ minHeight: '80px', resize: 'vertical' }} value={formData.kebutuhan || ''} onChange={(e) => setFormData({...formData, kebutuhan: e.target.value})} />
                                        </div>
                                        <div className="doc-form-group">
                                            <label>Keterangan</label>
                                            <textarea className="doc-input" style={{ minHeight: '80px', resize: 'vertical' }} value={formData.keterangan || ''} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} placeholder="Catatan tambahan..." />
                                        </div>
                                        <div className="doc-form-group">
                                            <label>Nilai Estimasi (Rp)</label>
                                            <input type="number" className="doc-input" value={formData.nilai_estimasi || ''} onChange={(e) => setFormData({...formData, nilai_estimasi: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="doc-form-group">
                                            <label>Tanggal Pengajuan</label>
                                            <input type="date" className="doc-input" value={formData.pm_date ? formData.pm_date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, pm_date: e.target.value})} />
                                        </div>
                                        <div className="doc-form-group">
                                            <label>PIC Marketing</label>
                                            <select className="doc-input" value={formData.marketing_pic_id || ''} onChange={(e) => setFormData({...formData, marketing_pic_id: e.target.value})}>
                                                <option value="">-- Pilih PIC Marketing --</option>
                                                {marketingPics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="doc-form-group">
                                            <label>PIC PM</label>
                                            <input type="text" className="doc-input" value={formData.pm_pic || ''} onChange={(e) => setFormData({...formData, pm_pic: e.target.value})} />
                                        </div>
                                        <FileUploadBox label="Dokumen PM (MOU/Draft)" field="file_pm" />
                                    </div>
                                </div>
                            </div>

                            {/* Kartu 2: Purchase Request (PR) */}
                            <div className="doc-card">
                                <div className="doc-card-title"><FileText size={18} color="#10b981"/> 2. Tahap Purchase Request (PR)</div>
                                <div className="dashboard-grid-2-equal">
                                    <div>
                                        <div className="doc-form-group">
                                            <label>No. PR</label>
                                            <input type="text" className="doc-input" value={formData.no_pr || ''} onChange={(e) => setFormData({...formData, no_pr: e.target.value})} />
                                        </div>
                                        <div className="doc-form-group">
                                            <label>Tanggal Submit PR</label>
                                            <input type="date" className="doc-input" value={formData.pr_submitted_date ? formData.pr_submitted_date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, pr_submitted_date: e.target.value})} />
                                        </div>
                                        <div className="doc-form-group">
                                            <label>Tanggal Approve PR</label>
                                            <input type="date" className="doc-input" value={formData.pr_approved_date ? formData.pr_approved_date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, pr_approved_date: e.target.value})} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="doc-form-group">
                                            <label>PIC PR</label>
                                            <select className="doc-input" value={formData.pr_pic || ''} onChange={(e) => setFormData({...formData, pr_pic: e.target.value})}>
                                                <option value="">-- Pilih PIC PR --</option>
                                                {teamRekonUsers.map(u => <option key={u.id} value={u.full_name}>{u.full_name}</option>)}
                                            </select>
                                        </div>
                                        <FileUploadBox label="Dokumen Bukti PR" field="file_pr" />
                                    </div>
                                </div>
                            </div>

                            {/* Kartu 3: Purchase Order (PO) */}
                            <div className="doc-card">
                                <div className="doc-card-title"><FileText size={18} color="#8b5cf6"/> 3. Tahap Purchase Order (PO)</div>
                                <div className="dashboard-grid-2-equal">
                                    <div>
                                        <div className="doc-form-group">
                                            <label>No. PO</label>
                                            <input type="text" className="doc-input" value={formData.no_po || ''} onChange={(e) => setFormData({...formData, no_po: e.target.value})} />
                                        </div>
                                        <div className="doc-form-group">
                                            <label>Vendor Terpilih</label>
                                            <select className="doc-input" value={formData.vendor_id || ''} onChange={(e) => setFormData({...formData, vendor_id: e.target.value})}>
                                                <option value="">-- Pilih Vendor dari Master Data --</option>
                                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                        </div>

                                    </div>
                                    <div>
                                        <div className="doc-form-group">
                                            <label>Tanggal PO</label>
                                            <input type="date" className="doc-input" value={formData.po_date ? formData.po_date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, po_date: e.target.value})} />
                                        </div>

                                        <FileUploadBox label="Dokumen Bukti PO" field="file_po" />
                                    </div>
                                </div>
                            </div>

                            {/* Kartu 4: Implementasi & BAST */}
                            <div className="doc-card">
                                <div className="doc-card-title"><CheckCircle2 size={18} color="#f59e0b"/> 4. Implementasi & BAST</div>
                                <div className="dashboard-grid-2-equal">
                                    <div>
                                        <div className="doc-form-group">
                                            <label>Tanggal Mulai Implementasi</label>
                                            <input type="date" className="doc-input" value={formData.implementasi_date ? formData.implementasi_date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, implementasi_date: e.target.value})} />
                                        </div>
                                        <FileUploadBox label="Dokumen Implementasi" field="file_implementasi" />
                                    </div>
                                    <div>
                                        <div className="doc-form-group">
                                            <label>Tanggal BAST</label>
                                            <input type="date" className="doc-input" value={formData.bast_date ? formData.bast_date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, bast_date: e.target.value})} />
                                        </div>
                                        <div className="doc-form-group">
                                            <label>Tanggal Selesai (Completed)</label>
                                            <input type="date" className="doc-input" value={formData.completed_date ? formData.completed_date.split('T')[0] : ''} onChange={(e) => setFormData({...formData, completed_date: e.target.value})} />
                                        </div>
                                        <FileUploadBox label="Dokumen BAST" field="file_bast" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Footer / Actions */}
                        <div style={{ padding: '20px 32px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: 0, zIndex: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Ubah Status Dokumen Ke:</label>
                                <select className="doc-input" style={{ width: 'auto', padding: '8px 16px', fontWeight: '600', color: '#0f172a' }} value={formData.status || 'PENGAJUAN'} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                                    {STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={handleCloseModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>Batal</button>
                                <button onClick={handleSave} style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}>
                                    <CheckCircle2 size={18} /> Simpan Perubahan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Keterangan */}

            {showKetModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                                    <MessageSquare size={20} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Catatan Pengajuan</h3>
                            </div>
                            <button onClick={() => setShowKetModal(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}><X size={18} /></button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Keterangan / Pesan Tambahan</label>
                            <textarea className="doc-input" style={{ minHeight: '130px', resize: 'vertical', width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', lineHeight: '1.5', color: '#334155', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }} value={ketData.keterangan || ''} onChange={(e) => setKetData({ ...ketData, keterangan: e.target.value })} onFocus={(e) => { e.currentTarget.style.borderColor = '#4338ca'; e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(67,56,202,0.1)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }} placeholder="Tuliskan catatan atau keterangan detail di sini..." />
                        </div>
                        <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setShowKetModal(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '600', color: '#475569', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}>Batal</button>
                            <button onClick={handleSaveKeterangan} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#4338ca', color: '#fff', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.2)' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3730a3'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}><Check size={18} /> Simpan Catatan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



