import React from 'react';

export default function ExportModal({ 
    isOpen, 
    onClose, 
    uniqueUsers, 
    exportSelectedUser, 
    setExportSelectedUser, 
    exportMonth, 
    setExportMonth, 
    onExport 
}) {
    if (!isOpen) return null;

    return (
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
                    <button onClick={onClose} className="modern-btn" style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1' }}>Batal</button>
                    <button onClick={onExport} className="modern-btn modern-btn-primary" style={{ background: '#10b981', border: 'none' }}>Ekspor Excel</button>
                </div>
            </div>
        </div>
    );
}
