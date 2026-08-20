import React from 'react';
import { Calendar, FileText, PlusCircle, PenTool, CheckCircle, UploadCloud } from 'lucide-react';

const actions = [
    { id: 1, title: 'Buat Project Baru', icon: PlusCircle, color: '#4f46e5', bg: '#e0e7ff' },
    { id: 2, title: 'Input Laporan Harian', icon: FileText, color: '#10b981', bg: '#dcfce7' },
    { id: 3, title: 'Ajukan Cuti', icon: Calendar, color: '#f59e0b', bg: '#fef3c7' },
    { id: 4, title: 'Update Milestone', icon: CheckCircle, color: '#8b5cf6', bg: '#ede9fe' },
    { id: 5, title: 'Upload Dokumen WBS', icon: UploadCloud, color: '#ec4899', bg: '#fce7f3' }
];

const QuickActions = () => {
    return (
        <div className="enterprise-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--secondary-900)' }}>Aksi Cepat</h3>
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                {actions.map(action => (
                    <button 
                        key={action.id}
                        className="hover-scale transition-all"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            minWidth: '180px', padding: '12px 16px',
                            backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)',
                            borderRadius: '12px', cursor: 'pointer', textAlign: 'left'
                        }}
                    >
                        <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: action.bg, color: action.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <action.icon size={18} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--secondary-800)' }}>{action.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickActions;
