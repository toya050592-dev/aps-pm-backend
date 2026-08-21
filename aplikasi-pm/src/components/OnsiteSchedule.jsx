import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle2, AlertTriangle, User } from 'lucide-react';

const OnsiteSchedule = () => {
    const [schedules, setSchedules] = useState([]);

    useEffect(() => {
        fetch('https://aps-pm-backend.onrender.com/api/onsite-schedules')
            .then(res => res.json())
            .then(data => setSchedules(data))
            .catch(err => console.error("Failed to load onsite schedules", err));
    }, []);
    return (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #f4f4f5', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Jadwal Onsite & Kunjungan</h2>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '9999px' }}>Hari Ini</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {schedules.filter(s => s.status !== 'Selesai').map((sched, index) => {
                    let picList = [];
                    try { picList = Array.isArray(sched.pic_names) ? sched.pic_names : JSON.parse(sched.pic_names || '[]'); } 
                    catch (e) { picList = [sched.pic_names]; }

                    const sDate = sched.start_date ? new Date(sched.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
                    const eDate = sched.end_date ? new Date(sched.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
                    const dateDisplay = (sDate && eDate && sDate !== eDate) ? `${sDate} - ${eDate}` : (sDate || eDate || '');

                    return (
                        <div key={sched.id || index} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #f4f4f5', backgroundColor: '#ffffff', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '16px' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#f4f4f5'; }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                                        {picList.map((name, i) => (
                                            <span key={i} style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                                                {name}{i < picList.length - 1 ? ', ' : ''}
                                            </span>
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{sched.role}</span>
                                </div>
                                <div style={{ marginLeft: '16px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '700', backgroundColor: sched.health === 'On Track' ? '#ecfdf5' : '#fffbeb', color: sched.health === 'On Track' ? '#10b981' : '#f59e0b', border: `1px solid ${sched.health === 'On Track' ? '#d1fae5' : '#fef3c7'}` }}>
                                        {sched.health === 'On Track' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                        {sched.health}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', fontWeight: '500' }}>
                                    <MapPin size={16} color="#3b82f6" /> {sched.location}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                                    <Clock size={16} color="#94a3b8" /> 
                                    <span>{sched.status} {dateDisplay ? `• ${dateDisplay}` : ''}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OnsiteSchedule;
