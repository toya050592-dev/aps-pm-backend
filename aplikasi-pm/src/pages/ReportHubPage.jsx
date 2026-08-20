import React, { useState } from 'react';
import { Download, FileText, PieChart, Users, FileSpreadsheet, FileIcon, Search, Filter } from 'lucide-react';

const mockReports = [
    { id: 1, title: 'Laporan Laba Rugi Q3 2026', category: 'Keuangan', date: '2026-10-01', size: '2.4 MB', type: 'PDF' },
    { id: 2, title: 'Budget vs Actual Project RSKGM', category: 'Keuangan', date: '2026-09-28', size: '1.1 MB', type: 'Excel' },
    { id: 3, title: 'Rekapitulasi Tagihan Vendor Bulan September', category: 'Keuangan', date: '2026-09-25', size: '3.2 MB', type: 'PDF' },
    
    { id: 4, title: 'Laporan Utilisasi Tim Bulan September', category: 'Operasional', date: '2026-10-02', size: '1.8 MB', type: 'PDF' },
    { id: 5, title: 'Status Keseluruhan Proyek Q3', category: 'Operasional', date: '2026-09-30', size: '4.5 MB', type: 'PDF' },
    { id: 6, title: 'Log Insiden & Penyelesaiannya', category: 'Operasional', date: '2026-09-20', size: '850 KB', type: 'Excel' },
    
    { id: 7, title: 'Rekap Absensi & Lembur Q3', category: 'HR', date: '2026-10-03', size: '1.5 MB', type: 'Excel' },
    { id: 8, title: 'Evaluasi Kinerja Karyawan (Tahunan)', category: 'HR', date: '2026-08-15', size: '3.0 MB', type: 'PDF' },
];

export default function ReportHubPage({ currentUser }) {
    const [activeTab, setActiveTab] = useState('Keuangan');
    const [searchQuery, setSearchQuery] = useState('');

    const tabs = [
        { id: 'Keuangan', label: 'Keuangan', icon: PieChart },
        { id: 'Operasional', label: 'Operasional', icon: FileText },
        { id: 'HR', label: 'HR', icon: Users },
    ];

    const filteredReports = mockReports.filter(report => 
        report.category === activeTab && 
        report.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--secondary-900)', letterSpacing: '-0.5px' }}>
                    Pusat Laporan
                </h1>
                <p style={{ color: 'var(--secondary-500)', fontSize: '15px', marginTop: '6px' }}>
                    Akses, unduh, dan kelola dokumen laporan penting terpusat.
                </p>
            </header>

            {/* Tab Navigation */}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '24px', 
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '2px'
            }}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: isActive ? '3px solid var(--primary-600)' : '3px solid transparent',
                                color: isActive ? 'var(--primary-600)' : 'var(--secondary-500)',
                                fontWeight: isActive ? '700' : '600',
                                fontSize: '15px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '-2px'
                            }}
                            onMouseEnter={e => {
                                if (!isActive) e.currentTarget.style.color = 'var(--secondary-800)';
                            }}
                            onMouseLeave={e => {
                                if (!isActive) e.currentTarget.style.color = 'var(--secondary-500)';
                            }}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px',
                gap: '16px',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '250px', maxWidth: '400px' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                        <Search size={18} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Cari laporan..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="modern-input"
                        style={{ paddingLeft: '40px', width: '100%' }}
                    />
                </div>
                <button className="modern-btn" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}>
                    <Filter size={16} style={{ marginRight: '6px' }} />
                    Filter Lanjutan
                </button>
            </div>

            {/* Reports List */}
            <div className="modern-card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="modern-table" style={{ margin: 0, width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ paddingLeft: '24px' }}>Nama Laporan</th>
                            <th>Tanggal Update</th>
                            <th>Ukuran</th>
                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReports.map(report => (
                            <tr key={report.id} style={{ transition: 'background-color 0.2s' }}>
                                <td style={{ paddingLeft: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                            width: '40px', height: '40px', borderRadius: '8px', 
                                            background: report.type === 'PDF' ? '#fee2e2' : '#dcfce7',
                                            color: report.type === 'PDF' ? '#dc2626' : '#16a34a',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {report.type === 'PDF' ? <FileIcon size={20} /> : <FileSpreadsheet size={20} />}
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: '600', color: 'var(--secondary-900)', fontSize: '14px' }}>
                                                {report.title}
                                            </p>
                                            <span style={{ fontSize: '12px', color: 'var(--secondary-500)' }}>
                                                {report.type} Document
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontSize: '14px', color: 'var(--secondary-700)' }}>
                                        {new Date(report.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                </td>
                                <td>
                                    <span style={{ fontSize: '14px', color: 'var(--secondary-500)' }}>{report.size}</span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                    <button 
                                        className="modern-btn" 
                                        style={{ 
                                            padding: '8px 16px', 
                                            fontSize: '13px', 
                                            background: 'var(--primary-50)', 
                                            color: 'var(--primary-700)', 
                                            border: '1px solid var(--primary-200)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                        onClick={() => alert(`Mengunduh ${report.title}...`)}
                                    >
                                        <Download size={14} /> Unduh
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredReports.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '48px', color: 'var(--secondary-400)' }}>
                                    <FileIcon size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                                    <p style={{ fontSize: '15px', margin: 0 }}>Belum ada laporan di kategori ini.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
