import React, { useState, useEffect } from 'react';
import OnsiteSchedule from './components/OnsiteSchedule';
import { 
    Briefcase, ListTodo, CheckCircle2, Clock, 
    PieChart as PieChartIcon, AlertTriangle, 
    MoreHorizontal, Eye, Calendar, Activity
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';

const API_URL = '';

const getColorForStatus = (statusName) => {
    if (!statusName) return '#9ca3af';
    const s = String(statusName).trim().toLowerCase();
    if (s.includes('selesai') || s.includes('go live') || s.includes('completed')) return '#10b981';
    if (s.includes('progress') || s.includes('ongoing') || s.includes('on track')) return '#3b82f6';
    if (s.includes('belum') || s.includes('planning') || s.includes('not started')) return '#f59e0b';
    if (s.includes('terlambat') || s.includes('delay') || s.includes('issue')) return '#ef4444';
    if (s.includes('hold')) return '#6b7280';
    
    // Hash for fallback color
    const colors = ['#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = s.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export default function DashboardRingkasan({ currentUser, setPage }) {
    const [stats, setStats] = useState(null);
    const [projectStatuses, setProjectStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('this_year');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterProductType, setFilterProductType] = useState('');
    const [productTypes, setProductTypes] = useState([]);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

    // Generate years for filter (from 2020 to current year + 2)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear + 2 - 2020 + 1 }, (_, i) => (2020 + i).toString());

    useEffect(() => {
        fetchStats();
    }, [period, startDate, endDate, filterProductType, filterYear]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            try {
                let query = `?period=${period}`;
                if (period === 'custom') {
                    if (startDate) query += `&startDate=${startDate}`;
                    if (endDate) query += `&endDate=${endDate}`;
                } else if (period === 'by_year') {
                    query += `&year=${filterYear}`;
                }
                if (filterProductType) {
                    query += `&productTypeId=${filterProductType}`;
                }
                const [statsRes, statusesRes, productsRes] = await Promise.all([
                    fetch(`${API_URL}/api/dashboard-stats${query}`),
                    fetch(`${API_URL}/api/master-data?type=STATUS_Project`),
                    fetch(`${API_URL}/api/master-data?type=JENIS_PRODUK`)
                ]);
                
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }
                if (statusesRes.ok) {
                    const statusData = await statusesRes.json();
                    setProjectStatuses(statusData.filter(d => d.is_active));
                }
                if (productsRes.ok) {
                    const productData = await productsRes.json();
                    setProductTypes(productData.filter(d => d.is_active));
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (projectId, newStatus) => {
        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchStats();
            } else {
                console.error('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating project status:', error);
        }
    };

    if (loading && !stats) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat Dashboard...</div>;
    if (!stats || !stats.metrics) return <div style={{ padding: '40px', textAlign: 'center' }}>Gagal memuat data.</div>;

    const { metrics, statusBreakdown = [], upcomingMilestones = [], attentionProjects = [], topProjects = [], picStats = [], projectList = [] } = stats;

    // Dummy data for small sparklines in KPI cards
    const sparklineData = [
        { value: 10 }, { value: 15 }, { value: 8 }, { value: 20 }, { value: 12 }, { value: 30 }
    ];

    // Derivasi Data: Jenis Produk (Total Project dan Nilai)
    let progresLabel = "Data Jenis Produk";
    if (period === 'this_month') progresLabel += " (Bulan Ini)";
    else if (period === 'last_month') progresLabel += " (Bulan Lalu)";
    else if (period === 'this_year') progresLabel += " (Tahun Ini)";
    else if (period === 'by_year') progresLabel += ` (Tahun ${filterYear})`;
    
    let trendData = [];
    if (projectList && projectList.length > 0) {
        const ptMap = {};
        projectList.forEach(p => {
            const ptName = p.product_type_name || 'Tanpa Jenis Produk';
            if (!ptMap[ptName]) ptMap[ptName] = { name: ptName, totalProjects: 0, totalValue: 0 };
            ptMap[ptName].totalProjects += 1;
            ptMap[ptName].totalValue += (parseFloat(p.project_value) || 0);
        });
        trendData = Object.values(ptMap).sort((a, b) => b.totalValue - a.totalValue).map(pt => ({
            name: pt.name.length > 15 ? pt.name.substring(0, 15) + '...' : pt.name,
            fullName: pt.name,
            totalProjects: pt.totalProjects,
            totalValue: pt.totalValue
        }));
    } else {
        trendData = [{ name: 'No Data', totalProjects: 0, totalValue: 0 }];
    }

    // Status breakdown formatting
    const pieData = statusBreakdown.map(item => ({
        name: item.name,
        value: item.value
    }));

    const formatRupiah = (angka) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
    };

    const renderKPICard = (title, value, subtitle, icon, color, trendDataObj = null) => (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
             onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
             onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; e.currentTarget.style.borderColor = '#f1f5f9'; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: `${color}15`, color: color }}>
                    {icon}
                </div>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569', letterSpacing: '0.02em' }}>{title}</span>
            </div>
            
            <div style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '48px', fontWeight: '900', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: '#0f172a', lineHeight: '1', letterSpacing: '-0.05em' }}>
                    {value}
                </div>
            </div>
            
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '20px' }}>
                {subtitle}
            </div>
            
            <div style={{ paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                {trendDataObj ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: trendDataObj.isPositive ? '#10b981' : '#ef4444' }}>
                        <span>{trendDataObj.isPositive ? '↑' : '↓'} {trendDataObj.value}%</span>
                        <span style={{ color: '#94a3b8', fontWeight: '500' }}>vs last month</span>
                    </div>
                ) : (
                    <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '500' }}>
                        No data available
                    </div>
                )}
            </div>
        </div>
    );

    // Derivasi Data: Top 5 PIC Marketing
    const topMarketing = (projectList || []).reduce((acc, p) => {
        // Ambil nama dari kemungkinan field (marketing_name atau pic_marketing_name atau fallback)
        const name = p.marketing_name || p.pic_marketing_name || p.marketing_pic || p.pic_marketing || 'Belum Ada PIC';
        if (!acc[name]) acc[name] = { name, totalProjects: 0, revenue: 0 };
        acc[name].totalProjects += 1;
        acc[name].revenue += parseFloat(p.project_value || 0);
        return acc;
    }, {});
    const topMarketingSorted = Object.values(topMarketing)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    return (
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '32px', boxSizing: 'border-box' }}>
            {/* Header */}
            <div className="flex-wrap-header">
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--secondary-900)' }}>Dashboard Ringkasan</h1>
                    <p style={{ color: 'var(--secondary-500)', fontSize: '15px' }}>Ringkasan status seluruh project update real time.</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: '#ffffff', padding: '8px 12px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {period === 'custom' && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', animation: 'fadeIn 0.2s ease-out' }}>
                                <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }} />
                                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>s/d</span>
                                <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', color: '#475569', background: '#f8fafc', cursor: 'pointer' }} />
                            </div>
                        )}
                        {period === 'by_year' && (
                            <div style={{ position: 'relative', animation: 'fadeIn 0.2s ease-out' }}>
                                <select 
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value)}
                                    style={{ padding: '8px 32px 8px 16px', appearance: 'none', cursor: 'pointer', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', fontWeight: '600', color: '#334155', background: '#f8fafc', minWidth: '100px' }}
                                >
                                    {years.map(yr => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '0', height: '0', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #64748b' }}></div>
                            </div>
                        )}
                        <div style={{ position: 'relative' }}>
                            <select 
                                value={filterProductType}
                                onChange={(e) => setFilterProductType(e.target.value)}
                                style={{ padding: '8px 32px 8px 16px', appearance: 'none', cursor: 'pointer', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', fontWeight: '600', color: '#334155', background: '#f8fafc', minWidth: '150px' }}
                            >
                                <option value="">Semua Jenis Produk</option>
                                {productTypes.map(pt => (
                                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                                ))}
                            </select>
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '0', height: '0', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #64748b' }}></div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <select 
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                style={{ padding: '8px 32px 8px 38px', appearance: 'none', cursor: 'pointer', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', fontWeight: '600', color: '#334155', background: '#f8fafc', minWidth: '150px' }}
                            >
                                <option value="all">Semua Waktu</option>
                                <option value="this_month">Bulan Ini</option>
                                <option value="last_month">Bulan Lalu</option>
                                <option value="this_year">Tahun Ini</option>
                                <option value="by_year">Periode per Tahun</option>
                                <option value="custom">Periode Kustom</option>
                            </select>
                            <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#3b82f6' }} />
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '0', height: '0', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #64748b' }}></div>
                        </div>
                    </div>
                    <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }}></div>
                    <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                        <Activity size={16} />
                        Export Report
                    </button>
                </div>
            </div>


            {/* KPI Cards Section Container */}
            <div className="modern-card" style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--secondary-900)', marginBottom: '24px' }}>Key Performance Indicators</h2>
                <div className="dashboard-grid-kpi">
                    {renderKPICard('Total Project', metrics.totalProjects, '100% dari total', <Briefcase size={20} />, '#6366f1')}
                    {renderKPICard('Total Tugas', metrics.totalTasks, '100% dari total', <ListTodo size={20} />, '#3b82f6')}
                    {renderKPICard('Tugas Selesai', metrics.completedTasks, `${metrics.totalTasks > 0 ? Math.round((metrics.completedTasks/metrics.totalTasks)*100) : 0}% dari total`, <CheckCircle2 size={20} />, '#10b981')}
                    {renderKPICard('Tugas Terlambat', metrics.delayedTasks, `${metrics.totalTasks > 0 ? Math.round((metrics.delayedTasks/metrics.totalTasks)*100) : 0}% dari total`, <Clock size={20} />, '#f59e0b')}
                    {renderKPICard('Progres Rata-rata', `${metrics.averageProgress}%`, 'Dari seluruh Project aktif', <PieChartIcon size={20} />, '#0ea5e9')}
                    {renderKPICard('Open Issue', metrics.openIssues, 'Project perlu perhatian', <AlertTriangle size={20} />, '#ef4444')}
                </div>
            </div>

            {/* Middle Charts Section Container */}
            <div className="modern-card" style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--secondary-900)', marginBottom: '24px' }}>Analytics & Overview</h2>
                <div className="dashboard-grid-3">
                    {/* Status per Project */}
                    {/* Status per Project */}
                    <div style={{ padding: '32px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px', color: '#475569' }}>Status per Project</h3>
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
                            <div style={{ height: '220px', flex: 1, position: 'relative' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData.reduce((acc, curr) => acc + curr.value, 0) === 0 ? [{ name: 'No Data', value: 1 }] : pieData} innerRadius={70} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                                            {(pieData.reduce((acc, curr) => acc + curr.value, 0) === 0 ? [{ name: 'No Data', value: 1 }] : pieData).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.name === 'No Data' ? '#f1f5f9' : getColorForStatus(entry.name)} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', lineHeight: '1', letterSpacing: '-0.05em' }}>{metrics.totalProjects}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginTop: '4px' }}>Total</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '16px' }}>
                                {pieData.map((entry, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getColorForStatus(entry.name) }}></div>
                                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{entry.name} <span style={{ color: '#94a3b8' }}>({entry.value})</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Progres Project */}
                    <div style={{ padding: '32px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px', color: '#475569' }}>{progresLabel}</h3>
                        <div style={{ height: '220px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }} dy={10} interval={0} />
                                    <YAxis hide={true} />
                                    <Tooltip 
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                                        <div style={{ fontWeight: '700', marginBottom: '8px', color: '#1e293b' }}>{data.fullName || label}</div>
                                                        <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>Jumlah: <b>{data.totalProjects} Project</b></div>
                                                        <div style={{ fontSize: '13px', color: '#475569' }}>Total Nilai: <b>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.totalValue)}</b></div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                        cursor={{ fill: '#f8fafc' }}
                                    />
                                    <Bar dataKey="totalValue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Dashboard Nilai Project */}
                    <div style={{ padding: '32px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', position: 'relative' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#475569' }}>Dashboard Nilai Project (Revenue)</h3>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px', fontWeight: '500' }}>Total Nilai Project</div>
                        <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '32px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', letterSpacing: '-0.05em' }}>
                            {formatRupiah(metrics.revenue.total)}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#64748b', fontWeight: '500' }}>Kontrak</span>
                                    <span style={{ fontWeight: '700', color: '#334155' }}>{formatRupiah(metrics.revenue.kontrak)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#64748b', fontWeight: '500' }}>Realisasi</span>
                                    <span style={{ fontWeight: '700', color: metrics.revenue.realisasi > 0 ? '#10b981' : '#475569' }}>{formatRupiah(metrics.revenue.realisasi)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#64748b', fontWeight: '500' }}>Sisa</span>
                                    <span style={{ fontWeight: '700', color: '#ef4444' }}>{formatRupiah(metrics.revenue.kontrak - metrics.revenue.realisasi)}</span>
                                </div>
                            </div>
                            <div style={{ width: '80px', height: '80px', marginLeft: '24px', position: 'relative' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={metrics.revenue.kontrak === 0 ? [{value: 1}] : [{value: metrics.revenue.realisasi}, {value: Math.max(0, metrics.revenue.kontrak - metrics.revenue.realisasi)}]} 
                                            innerRadius={28} outerRadius={38} dataKey="value" startAngle={90} endAngle={-270} stroke="none"
                                        >
                                            <Cell fill={metrics.revenue.kontrak === 0 || metrics.revenue.realisasi === 0 ? "#cbd5e1" : "#10b981"} />
                                            {metrics.revenue.kontrak !== 0 && <Cell fill="#f1f5f9" />}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '13px', fontWeight: '800', color: '#475569' }}>
                                    {metrics.revenue.kontrak > 0 ? Math.round((metrics.revenue.realisasi / metrics.revenue.kontrak) * 100) : 0}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section Layout */}
            <div className="dashboard-grid-2-sidebar">
                
                {/* Left Side: Table & Bottom Charts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    
                    {/* Daftar Project Table Section Container */}
                    <div className="modern-card" style={{ padding: '32px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--secondary-900)', marginBottom: '24px' }}>Daftar Project Aktif</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                        <th style={{ padding: '16px 12px', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Project</th>
                                        <th style={{ padding: '16px 12px', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Status</th>
                                        <th style={{ padding: '16px 12px', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Progres</th>
                                        <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Nilai Kontrak</th>
                                        <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Tgl Go Live</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectList.length > 0 ? projectList.map((p, i) => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #f4f4f5', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc', transition: 'background-color 0.2s' }}>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ fontWeight: '700', color: '#0f172a' }}>{p.project_name}</div>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <select 
                                                    value={p.status}
                                                    onChange={(e) => handleStatusChange(p.id, e.target.value)}
                                                    style={{ 
                                                        padding: '6px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '700',
                                                        backgroundColor: `${getColorForStatus(p.status)}15`,
                                                        color: getColorForStatus(p.status),
                                                        border: `1px solid ${getColorForStatus(p.status)}30`, outline: 'none', cursor: 'pointer', appearance: 'none', textAlign: 'center'
                                                    }}
                                                >
                                                    {projectStatuses.length > 0 ? (
                                                        projectStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                                                    ) : (
                                                        <>
                                                            <option value="Not Started">Not Started</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="On Hold">On Hold</option>
                                                            <option value="Go Live">Go Live</option>
                                                            <option value="Completed">Completed</option>
                                                        </>
                                                    )}
                                                </select>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: '600', fontSize: '13px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                                        {p.progress || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '600', color: '#334155', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                                                {formatRupiah(p.project_value)}
                                            </td>
                                            <td style={{ padding: '16px 12px', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>
                                                {p.go_live_date ? new Date(p.go_live_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '32px 12px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada project pada periode ini</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Charts Row Section Container */}
                    <div className="dashboard-grid-2-equal">
                        {/* Top 5 Project */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Top 5 Project Berdasarkan Nilai</h3>
                            <div style={{ height: '220px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topProjects} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="project_name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={100} />
                                        <Tooltip formatter={(value) => formatRupiah(value)} />
                                        <Bar dataKey="project_value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Nilai Project per Status */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Nilai Project per Status</h3>
                            <div className="flex-responsive-pie">
                                <ResponsiveContainer width="100%" height="100%" style={{ flex: '0 0 170px' }}>
                                    <PieChart>
                                        <Pie data={statusBreakdown} innerRadius={60} outerRadius={85} cx="50%" cy="50%" dataKey="revenue" nameKey="name" stroke="none">
                                            {statusBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getColorForStatus(entry.name)} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatRupiah(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', justifyContent: 'center', minWidth: 0 }}>
                                    {statusBreakdown.map((s, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getColorForStatus(s.name) }}></div>
                                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#475569' }}>{s.name}</span>
                                            </div>
                                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>{formatRupiah(s.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enterprise Modules Row Section Container - Moved here */}
                    <OnsiteSchedule />

                </div>

                {/* Right Side: Sidebar Section Containers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0, width: '100%' }}>
                    
                    {/* Top 5 PIC Marketing */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '24px', width: '100%', boxSizing: 'border-box' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>Top 5 PIC Marketing</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {topMarketingSorted.map((pic, idx) => (
                                <div key={idx} className="marketing-row">
                                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                                        <div className="marketing-avatar">
                                            {pic.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {pic.name}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                        <span className="marketing-badge">{pic.totalProjects} Project</span>
                                        <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                                            {formatRupiah(pic.revenue)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {topMarketingSorted.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontStyle: 'italic', fontSize: '13px' }}>Belum ada data PIC Marketing</div>
                            )}
                        </div>
                    </div>

                    {/* Beban Kerja PIC */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '24px', width: '100%', boxSizing: 'border-box' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>Beban Kerja PIC (Field Engineer)</h3>
                        <div style={{ height: '240px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={picStats} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="pic_name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} width={80} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value) => [`${value} Project`, 'Total']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="total_projects" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Project Perlu Perhatian */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '24px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                                <AlertTriangle size={20} strokeWidth={2.5} />
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Project Perlu Perhatian</h3>
                            </div>
                            <span onClick={() => setPage && setPage('dashboard')} style={{ fontSize: '13px', color: '#3b82f6', cursor: 'pointer', fontWeight: '600', padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s' }}>Lihat Semua</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {attentionProjects.map((p, i) => {
                                let progVal = 0;
                                let progText = '0%';
                                if (p.progress) {
                                    progText = p.progress;
                                    const match = String(p.progress).match(/(\d+)/);
                                    if (match) progVal = parseInt(match[0], 10);
                                    if (progVal > 100) progVal = 100;
                                } else if (p.total_tasks_count > 0) {
                                    progVal = Math.round((p.completed_tasks_count / p.total_tasks_count) * 100);
                                    progText = `${p.completed_tasks_count}/${p.total_tasks_count} tugas selesai`;
                                } else {
                                    progText = 'Belum ada tugas';
                                }

                                return (
                                <div key={p.id} style={{ borderBottom: i !== attentionProjects.length - 1 ? '1px dashed #e2e8f0' : 'none', paddingBottom: i !== attentionProjects.length - 1 ? '16px' : '0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' }}>
                                        <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', lineHeight: '1.4' }}>{p.project_name}</div>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', backgroundColor: '#fef3c7', padding: '4px 10px', borderRadius: '12px', flexShrink: 0, border: '1px solid #fde68a' }}>At Risk</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{progText}</span>
                                        <div style={{ flex: '1', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${progVal}%`, height: '100%', backgroundColor: '#ef4444', borderRadius: '4px' }}></div>
                                        </div>
                                    </div>
                                    {p.issues && (
                                        <div style={{ fontSize: '12px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #ef4444', fontStyle: 'italic', lineHeight: '1.5' }}>
                                            "{p.issues}"
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                            {attentionProjects.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0', fontSize: '14px' }}>Semua project berjalan lancar 🎉</div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Milestone */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', padding: '24px', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
                                <Calendar size={20} strokeWidth={2.5} />
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>Upcoming Milestone</h3>
                            </div>
                            <span onClick={() => setPage && setPage('dashboard')} style={{ fontSize: '13px', color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}>Lihat Semua</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {upcomingMilestones.map((m, i) => (
                                <div key={i} style={{ borderBottom: i !== upcomingMilestones.length - 1 ? '1px dashed #e2e8f0' : 'none', paddingBottom: i !== upcomingMilestones.length - 1 ? '16px' : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                    <div style={{ flex: '1', minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.task_name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.project_name}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #f1f5f9', flexShrink: 0 }}>
                                        <Calendar size={14} color="#64748b" />
                                        <span style={{ fontSize: '12px', fontWeight: '600' }}>
                                            {new Date(m.end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {upcomingMilestones.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0', fontSize: '14px' }}>Tidak ada milestone dalam waktu dekat</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

