import React from 'react';
import { CheckCircle, XCircle, Trash2, Camera, Eye, Clock, FileText } from 'lucide-react';

export default function OvertimeTable({ 
    requests, 
    role, 
    onApprove, 
    onDelete, 
    onPhotoClick 
}) {
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
                <table className="modern-table" style={{ margin: 0, width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ paddingLeft: '24px' }}>Karyawan</th>
                            <th>Departemen</th>
                            <th>Tanggal & Waktu</th>
                            <th>Jam</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--secondary-500)' }}>
                                    Tidak ada data pengajuan lembur untuk bulan ini.
                                </td>
                            </tr>
                        ) : requests.map(req => (
                            <tr key={req.id}>
                                <td style={{ paddingLeft: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                            width: '36px', height: '36px', borderRadius: '50%', 
                                            background: 'var(--primary-100)', color: 'var(--primary-700)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: '14px'
                                        }}>
                                            {getInitials(req.user_name)}
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: '600', color: 'var(--secondary-900)', fontSize: '14px' }}>
                                                {req.user_name}
                                            </p>
                                            <span style={{ fontSize: '12px', color: 'var(--secondary-500)' }}>
                                                {req.reason ? (req.reason.length > 25 ? req.reason.substring(0, 25) + '...' : req.reason) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                                        {req.department}
                                    </span>
                                </td>
                                <td>
                                    <p style={{ margin: 0, fontWeight: '500', color: 'var(--secondary-800)', fontSize: '14px' }}>
                                        {new Date(req.overtime_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                    <span style={{ fontSize: '12px', color: 'var(--secondary-500)' }}>
                                        {req.start_time?.slice(0,5) || '-'} s/d {req.end_time?.slice(0,5) || '-'} {req.is_holiday ? '(Libur)' : ''}
                                    </span>
                                </td>
                                <td><strong style={{ color: 'var(--secondary-900)' }}>{(parseFloat(req.hours || 0) * (req.is_holiday ? 2 : 1)).toFixed(2)}h</strong></td>
                                <td>
                                    <span style={{ 
                                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold',
                                        background: req.status === 'Approved' ? '#dcfce7' : '#fef3c7',
                                        color: req.status === 'Approved' ? '#16a34a' : '#d97706'
                                    }}>
                                        {req.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        {req.evidence_url && (
                                            <button onClick={() => onPhotoClick(`${API_URL}${req.evidence_url}`)} className="modern-btn" style={{ padding: '6px', background: '#e0f2fe', color: '#0284c7', border: 'none' }} title="Lihat Foto">
                                                <FileImage size={16} />
                                            </button>
                                        )}
                                        {req.status === 'Pending' && (currentUser?.role === 'Admin' || (currentUser?.permissions || []).includes('approve_overtime')) && (
                                            <button 
                                                onClick={() => onApprove(req.id)}
                                                className="modern-btn" 
                                                style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--primary-600)', color: 'white' }}
                                            >
                                                <ShieldCheck size={14} style={{ marginRight: '4px' }} /> Setujui
                                            </button>
                                        )}
                                        {(currentUser?.role === 'Admin' || (currentUser?.permissions || []).includes('approve_overtime')) && (
                                            <button 
                                                onClick={() => onDelete(req.id)}
                                                className="modern-btn" 
                                                style={{ padding: '6px 10px', fontSize: '12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                                title="Hapus"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '48px', color: 'var(--secondary-400)' }}>
                                    <p style={{ fontSize: '14px', margin: 0 }}>Belum ada pengajuan lembur.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
    );
}
