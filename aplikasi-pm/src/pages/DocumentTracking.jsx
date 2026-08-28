import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, UploadCloud, Filter, FileText, Check, MoreVertical, X, CheckCircle2, ChevronRight, CheckCircle, FileCheck, DollarSign, MoreHorizontal, Trash2, AlertCircle, MessageSquare, ListTodo } from 'lucide-react';
import { API_URL } from '../App';
import DocumentTable from '../components/DocumentTracking/DocumentTable';
import DetailModal from '../components/DocumentTracking/DetailModal';
import KeteranganModal from '../components/DocumentTracking/KeteranganModal';

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

            <DocumentTable 
                documents={filteredDocs}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalPages={totalPages}
                getStatusBadge={getStatusBadge}
                onEdit={handleOpenModal}
                onEditKeterangan={(doc) => { setKetData({ id: doc.id, keterangan: doc.keterangan || '' }); setShowKetModal(true); }}
                onDelete={handleDelete}
            />

            <DetailModal 
                isOpen={showModal}
                onClose={handleCloseModal}
                selectedDoc={selectedDoc}
                formData={formData}
                setFormData={setFormData}
                filesToUpload={filesToUpload}
                handleFileChange={handleFileChange}
                STEPS={STEPS}
                vendors={vendors}
                marketingPics={marketingPics}
                historyList={historyList}
                users={users}
                handoverForm={handoverForm}
                setHandoverForm={setHandoverForm}
                handleSubmitHandover={handleSubmitHandover}
                handleReceiveHandover={handleReceiveHandover}
                currentUser={currentUser}
                handleSave={handleSave}
            />

            <KeteranganModal 
                showKetModal={showKetModal} 
                setShowKetModal={setShowKetModal} 
                ketData={ketData} 
                setKetData={setKetData} 
                handleSaveKeterangan={handleSaveKeterangan} 
            />
        </div>
    );
}
