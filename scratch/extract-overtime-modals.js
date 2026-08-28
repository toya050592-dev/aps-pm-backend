const fs = require('fs');

let c = fs.readFileSync('aplikasi-pm/src/pages/OvertimePage.jsx', 'utf8');

// Add imports
if (!c.includes('ExportModal')) {
    c = c.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport ExportModal from '../components/Overtime/ExportModal';\nimport PhotoPreviewModal from '../components/Overtime/PhotoPreviewModal';"
    );
}

// Remove Export Excel Modal
const oldExportModal = `{/* Export Excel Modal */}
                {showExportModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="modern-card" style={{ width: '400px', animation: 'fadeIn 0.2s ease-out' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Pilih Filter Ekspor</h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Nama PIC</label>
                                <select 
                                    className="modern-select" 
                                    style={{ width: '100%' }}
                                    value={exportSelectedUser}
                                    onChange={e => setExportSelectedUser(e.target.value)}
                                >
                                    <option value="">Semua Karyawan (Data Gabungan)</option>
                                    {uniqueUsers.map((u, i) => <option key={i} value={u.name}>{u.name}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Bulan</label>
                                <select 
                                    className="modern-select" 
                                    style={{ width: '100%' }}
                                    value={exportMonth}
                                    onChange={e => setExportMonth(e.target.value)}
                                >
                                    <option value="Semua">Semua Bulan</option>
                                    <option value="0">Januari</option>
                                    <option value="1">Februari</option>
                                    <option value="2">Maret</option>
                                    <option value="3">April</option>
                                    <option value="4">Mei</option>
                                    <option value="5">Juni</option>
                                    <option value="6">Juli</option>
                                    <option value="7">Agustus</option>
                                    <option value="8">September</option>
                                    <option value="9">Oktober</option>
                                    <option value="10">November</option>
                                    <option value="11">Desember</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowExportModal(false)} className="modern-btn" style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1' }}>Batal</button>
                                <button onClick={generateExcel} className="modern-btn modern-btn-primary" style={{ background: '#10b981', border: 'none' }}>Ekspor Excel</button>
                            </div>
                        </div>
                    </div>
                )}`;

const newExportModal = `<ExportModal 
                    isOpen={showExportModal} 
                    onClose={() => setShowExportModal(false)}
                    uniqueUsers={uniqueUsers}
                    exportSelectedUser={exportSelectedUser}
                    setExportSelectedUser={setExportSelectedUser}
                    exportMonth={exportMonth}
                    setExportMonth={setExportMonth}
                    onExport={generateExcel}
                />`;
                
c = c.replace(oldExportModal, newExportModal);

// Remove Photo Preview Modal
const oldPhotoModal = `{/* Photo Preview Modal */}
            {photoPreviewUrl && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setPhotoPreviewUrl(null)}>
                    <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setPhotoPreviewUrl(null)}
                            style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: 'white', fontSize: '32px', cursor: 'pointer', zIndex: 1001 }}
                        >
                            &times;
                        </button>
                        <img src={photoPreviewUrl} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} />
                    </div>
                </div>
            )}`;
const newPhotoModal = `<PhotoPreviewModal photoUrl={photoPreviewUrl} onClose={() => setPhotoPreviewUrl(null)} />`;
c = c.replace(oldPhotoModal, newPhotoModal);

fs.writeFileSync('aplikasi-pm/src/pages/OvertimePage.jsx', c);
