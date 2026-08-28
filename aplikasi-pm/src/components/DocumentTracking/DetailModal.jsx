import React from 'react';
import { X, CheckCircle2, ChevronRight, Upload, Calendar, Building2, User, FileText, AlertCircle, Send, Check } from 'lucide-react';

export default function DetailModal({
    isOpen,
    onClose,
    selectedDoc,
    formData,
    setFormData,
    filesToUpload,
    handleFileChange,
    STEPS,
    vendors,
    marketingPics,
    teamRekonUsers,
    users,
    handoverForm,
    setHandoverForm,
    handleSubmitHandover,
    handleReceiveHandover,
    currentUser,
    handleSave
}) {
    if (!isOpen) return null;

    return (<>
            {/* DETAIL MODAL (PRO MAX CARDS LAYOUT) */}
            
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
    </>);
}
