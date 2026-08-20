import React, { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet, FileIcon } from 'lucide-react';

const ReportHub = () => {
    const [activeTab, setActiveTab] = useState('Finance');
    const [reportsData, setReportsData] = useState([]);
    const tabs = ['Finance', 'Operational', 'HR'];

    useEffect(() => {
        fetch('http://127.0.0.1:3000/api/reports')
            .then(res => res.json())
            .then(data => setReportsData(data))
            .catch(err => console.error("Failed to load reports", err));
    }, []);

    return (
        <div className="enterprise-card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--secondary-900)' }}>Pusat Laporan</h3>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-app)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    {tabs.map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            style={{ 
                                padding: '4px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px',
                                border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                                backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                                color: activeTab === tab ? 'var(--primary-600)' : 'var(--secondary-500)',
                                boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reportsData.filter(r => r.category === activeTab).map(report => (
                    <div key={report.id} className="transition-all hover-scale" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ 
                                width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: report.type === 'excel' ? '#dcfce7' : '#fee2e2',
                                color: report.type === 'excel' ? '#16a34a' : '#dc2626'
                            }}>
                                {report.type === 'excel' ? <FileSpreadsheet size={18} /> : <FileText size={18} />}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--secondary-900)' }}>{report.title}</div>
                                <div style={{ fontSize: '11px', color: 'var(--secondary-500)' }}>{new Date(report.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            </div>
                        </div>
                        <button style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} className="hover-scale">
                            <Download size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReportHub;
