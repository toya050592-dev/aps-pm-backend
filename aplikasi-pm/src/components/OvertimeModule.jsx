import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { User, Clock } from 'lucide-react';

const overtimeData = [
    { id: 1, name: 'Dian Saputra', dept: 'Engineering', hours: 4, date: '08 Aug' },
    { id: 2, name: 'Reza Pahlevi', dept: 'Support', hours: 2, date: '08 Aug' },
    { id: 3, name: 'Nina Wati', dept: 'Sales', hours: 3, date: '07 Aug' },
];

const chartData = [
    { name: 'Eng', hours: 45 },
    { name: 'Sup', hours: 30 },
    { name: 'Sales', hours: 15 },
    { name: 'Ops', hours: 10 },
];

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899'];

const OvertimeModule = () => {
    return (
        <div className="enterprise-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--secondary-900)' }}>Overtime / Lembur</h3>
                <span className="badge badge-danger">3 Pending</span>
            </div>

            <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                {/* Table Section */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--secondary-500)', textTransform: 'uppercase' }}>Permintaan Terbaru</div>
                    {overtimeData.map(ot => (
                        <div key={ot.id} className="transition-all hover-scale" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '10px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-light)' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-500)' }}>
                                <User size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--secondary-900)' }}>{ot.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--secondary-500)' }}>{ot.dept} &bull; {ot.date}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', fontSize: '13px', color: 'var(--danger-text)', backgroundColor: 'var(--danger-bg)', padding: '4px 8px', borderRadius: '8px' }}>
                                <Clock size={14} /> {ot.hours}h
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chart Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-light)', paddingLeft: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--secondary-500)', textTransform: 'uppercase', marginBottom: '12px' }}>Total per Dept</div>
                    <div style={{ flex: 1, minHeight: '120px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={5} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OvertimeModule;
