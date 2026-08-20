import React, { useState, useEffect } from 'react';
import { Activity, Briefcase, Users, Clock, AlertCircle } from 'lucide-react';

const API_URL = '';

function DashboardSummary() {
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => { fetchSummary(); }, []);

    const fetchSummary = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dashboard-summary`);
            if (!response.ok) throw new Error('Server merespon dengan error');
            setSummary(await response.json());
        } catch (err) {
            console.error(err);
            setError('Gagal terhubung ke server backend. Pastikan server.js sedang berjalan.');
        }
    };

    if (error) return <p style={{ color: '#dc2626' }}>{error}</p>;
    if (!summary) return <p style={{ color: '#94a3b8' }}>Memuat ringkasan...</p>;

    const cardStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };

    return (
        <div>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--secondary-900)', letterSpacing: '-0.5px' }}>Dashboard Ringkasan</h1>
                <p style={{ color: 'var(--secondary-500)', fontSize: '15px', marginTop: '6px' }}>Ringkasan status seluruh Project — siap untuk dilaporkan ke atasan.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div className="modern-card">
                    <p style={{ fontSize: '13px', color: 'var(--secondary-500)', fontWeight: '600', marginBottom: '8px' }}>Total Project</p>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--secondary-900)' }}>{summary.total_projects}</p>
                </div>
                <div className="modern-card">
                    <p style={{ fontSize: '13px', color: 'var(--secondary-500)', fontWeight: '600', marginBottom: '8px' }}>Total Tugas</p>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--secondary-900)' }}>{summary.total_tasks}</p>
                </div>
                <div className="modern-card">
                    <p style={{ fontSize: '13px', color: 'var(--secondary-500)', fontWeight: '600', marginBottom: '8px' }}>Tugas Selesai</p>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--success-text)' }}>{summary.total_completed}</p>
                </div>
                <div className="modern-card">
                    <p style={{ fontSize: '13px', color: 'var(--secondary-500)', fontWeight: '600', marginBottom: '8px' }}>Tugas Terlambat</p>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: summary.total_late > 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>{summary.total_late}</p>
                </div>
            </div>

            <div className="modern-card">
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--secondary-800)' }}>Status per Project</h3>
                {summary.projects.map(proj => (
                    <div key={proj.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '16px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className={`status-dot ${proj.health === 'On_Track' ? 'on-track' : 'late'}`} />
                                <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--secondary-900)' }}>{proj.project_name}</span>
                            </div>
                            <span style={{ fontSize: '13px', color: 'var(--secondary-500)', fontWeight: '600' }}>
                                {proj.completed_tasks}/{proj.total_tasks} tugas selesai
                                {proj.late_tasks_count > 0 && (
                                    <span style={{ color: 'var(--danger-text)', fontWeight: '700', marginLeft: '10px' }}>· {proj.late_tasks_count} terlambat</span>
                                )}
                            </span>
                        </div>
                        {proj.open_issues.length > 0 && (
                            <div style={{ marginLeft: '24px', marginTop: '10px' }}>
                                {proj.open_issues.map((issue, idx) => (
                                    <p key={idx} style={{ fontSize: '13px', color: '#b45309', backgroundColor: '#fef3c7', padding: '10px 14px', borderRadius: '8px', marginBottom: '6px', fontWeight: '500' }}>
                                        <strong>{issue.task_name}:</strong> {issue.notes}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {summary.projects.length === 0 && (
                    <p style={{ color: 'var(--secondary-500)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>Belum ada data Project.</p>
                )}
            </div>
        </div>
    );
}

// ---------- MANAJEMEN TIM ----------

export default DashboardSummary;
