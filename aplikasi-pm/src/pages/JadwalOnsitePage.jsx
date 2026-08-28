import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, CheckCircle2, AlertTriangle, User, CalendarDays, Search, Filter, Plus, Trash2, Edit, X, ChevronDown, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const JadwalOnsitePage = ({ currentUser }) => {
    const [schedules, setSchedules] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        pic_names: [],
        role: 'Field Engineer',
        location: '',
        status: 'Tiba',
        start_date: '',
        end_date: '',
        health: 'On Track'
    });

    // Custom Multi-select state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchSchedules = () => {
        fetch(`${API_URL}/api/onsite-schedules`)
            .then(res => res.json())
            .then(data => {
                setSchedules(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load onsite schedules", err);
                setLoading(false);
            });
    };

    const fetchUsers = () => {
        fetch(`${API_URL}/api/users`)
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error("Failed to load users", err));
    };

    useEffect(() => {
        fetchSchedules();
        fetchUsers();
    }, []);

    const getStatusColor = (status) => {
        if (status?.toLowerCase() === 'tiba') return '#16a34a'; // Green
        if (status?.toLowerCase() === 'perjalanan') return '#ca8a04'; // Yellow
        return '#64748b'; // Gray
    };

    const getHealthColor = (health) => {
        if (health?.toLowerCase() === 'on track') return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
        if (health?.toLowerCase() === 'at risk') return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
        return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const togglePicSelection = (fullName) => {
        setFormData(prev => {
            const isSelected = prev.pic_names.includes(fullName);
            if (isSelected) {
                return { ...prev, pic_names: prev.pic_names.filter(n => n !== fullName) };
            } else {
                return { ...prev, pic_names: [...prev.pic_names, fullName] };
            }
        });
    };

    const handleOpenModal = (sched = null) => {
        if (sched) {
            setEditingId(sched.id);
            const sDate = sched.start_date ? new Date(sched.start_date).toISOString().split('T')[0] : '';
            const eDate = sched.end_date ? new Date(sched.end_date).toISOString().split('T')[0] : '';
            let parsedNames = [];
            try { parsedNames = Array.isArray(sched.pic_names) ? sched.pic_names : JSON.parse(sched.pic_names || '[]'); } catch(e) { parsedNames = [sched.pic_names]; }
            
            setFormData({
                pic_names: parsedNames,
                role: sched.role,
                location: sched.location,
                status: sched.status,
                start_date: sDate,
                end_date: eDate,
                health: sched.health
            });
        } else {
            setEditingId(null);
            setFormData({
                pic_names: [],
                role: 'Field Engineer',
                location: '',
                status: 'Tiba',
                start_date: '',
                end_date: '',
                health: 'On Track'
            });
        }
        setIsModalOpen(true);
        setIsDropdownOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.pic_names.length === 0) {
            alert("Harap pilih minimal satu Personel.");
            return;
        }

        const url = editingId 
            ? `${API_URL}/api/onsite-schedules/${editingId}`
            : `${API_URL}/api/onsite-schedules`;
        
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchSchedules(); // refresh data
            } else {
                console.error("Gagal menyimpan jadwal");
            }
        } catch (err) {
            console.error("Network error", err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Yakin ingin menghapus jadwal ini?')) {
            try {
                const res = await fetch(`${API_URL}/api/onsite-schedules/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    fetchSchedules(); // refresh
                }
            } catch (err) {
                console.error("Gagal menghapus", err);
            }
        }
    };

    const renderDateRange = (start, end) => {
        const s = start ? new Date(start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
        const e = end ? new Date(end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
        if (s && e && s !== e) return `${s} - ${e}`;
        return s || e || '-';
    };

    // Shared input styles for enterprise look
    const inputStyles = {
        width: '100%', 
        padding: '12px 16px', 
        borderRadius: '10px', 
        border: '1px solid var(--border-light)', 
        fontSize: '14px', 
        outline: 'none',
        backgroundColor: '#f8fafc',
        color: 'var(--secondary-800)',
        transition: 'all 0.2s',
    };

    const labelStyles = {
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '13px', 
        fontWeight: '600', 
        color: 'var(--secondary-600)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    return (
        <div style={{ padding: '0px' }}>
            {/* --- HEADER --- */}
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--secondary-900)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ backgroundColor: 'var(--primary-100)', padding: '8px', borderRadius: '10px', color: 'var(--primary-600)' }}>
                            <CalendarDays size={24} />
                        </div>
                        Jadwal Onsite Tim
                    </h1>
                    <p style={{ color: 'var(--secondary-500)', fontSize: '15px', marginTop: '8px' }}>
                        Pantau penugasan lapangan, lokasi, dan indikator kesehatan (Health Score) secara real-time.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-400)' }} />
                        <input 
                            type="text" 
                            placeholder="Cari personel..." 
                            style={{ padding: '10px 16px 10px 36px', borderRadius: '10px', border: '1px solid var(--border-light)', fontSize: '14px', outline: 'none' }}
                        />
                    </div>
                    <button className="hover-scale" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', backgroundColor: 'white', color: 'var(--secondary-700)', border: '1px solid var(--border-light)', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                        <Filter size={16} /> Filter
                    </button>
                    <button onClick={() => handleOpenModal()} className="hover-scale" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', backgroundColor: 'var(--primary-600)', color: 'white', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <Plus size={18} /> Tambah Jadwal
                    </button>
                </div>
            </header>

            {/* --- TIMELINE --- */}
            <div className="enterprise-card" style={{ padding: '32px 24px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-500)' }}>Memuat jadwal...</div>
                ) : (
                    <div className="timeline-container" style={{ position: 'relative', paddingLeft: '32px' }}>
                        <div style={{ position: 'absolute', left: '18px', top: '24px', bottom: '24px', width: '2px', backgroundColor: 'var(--border-light)', zIndex: 0 }}></div>

                        {schedules.filter(s => s.status !== 'Selesai').map((sched, index) => {
                            const healthStyle = getHealthColor(sched.health);
                            const statusColor = getStatusColor(sched.status);
                            
                            // Parse pic_names
                            let picList = [];
                            try { picList = Array.isArray(sched.pic_names) ? sched.pic_names : JSON.parse(sched.pic_names || '[]'); } 
                            catch (e) { picList = [sched.pic_names]; }

                            return (
                                <div key={sched.id} className="timeline-item hover-scale transition-all" style={{ position: 'relative', marginBottom: index === schedules.length - 1 ? '0' : '40px', zIndex: 1 }}>
                                    
                                    {/* Timeline Dot */}
                                    <div style={{ position: 'absolute', left: '-21px', top: '24px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: statusColor, border: '3px solid var(--bg-card)', boxShadow: '0 0 0 2px var(--border-light)' }}></div>
                                    
                                    {/* Content Card */}
                                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)' }}>
                                        
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flex: 1 }}>
                                            {/* Avatar */}
                                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)', position: 'relative', flexShrink: 0 }}>
                                                <User size={28} />
                                                <div style={{ position: 'absolute', bottom: '0', right: '0', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: statusColor, border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div style={{ flex: 1 }}>
                                                {/* PIC Names */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                                    {picList.map((name, i) => (
                                                        <span key={i} style={{ backgroundColor: 'var(--bg-app)', color: 'var(--secondary-900)', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', border: '1px solid var(--border-light)' }}>
                                                            {name}
                                                        </span>
                                                    ))}
                                                </div>
                                                
                                                {/* Meta Info Layout */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', color: 'var(--secondary-600)', fontSize: '14px' }}>
                                                    
                                                    {/* Role */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary-50)', padding: '6px 12px', borderRadius: '8px', color: 'var(--primary-700)', fontWeight: '600' }}>
                                                        <User size={16} /> {sched.role}
                                                    </div>

                                                    {/* Location */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRight: '1px solid var(--border-light)', paddingRight: '16px' }}>
                                                        <MapPin size={16} color="var(--secondary-400)"/> 
                                                        <span style={{ fontWeight: '500' }}>{sched.location}</span>
                                                    </div>

                                                    {/* Date */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <CalendarDays size={16} color="var(--secondary-400)"/> 
                                                        <span style={{ fontWeight: '500' }}>{renderDateRange(sched.start_date, sched.end_date)}</span>
                                                    </div>
                                                    
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status, Health Score & Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
                                            
                                            {/* Status Flag */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--secondary-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusColor, fontWeight: '700', fontSize: '14px' }}>
                                                    <Clock size={16} /> {sched.status}
                                                </div>
                                            </div>

                                            {/* Health Score */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--secondary-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Health Score</span>
                                                <div style={{ 
                                                    backgroundColor: healthStyle.bg, color: healthStyle.text, border: `1px solid ${healthStyle.border}`, 
                                                    padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px'
                                                }}>
                                                    {sched.health?.toLowerCase() === 'on track' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                                    {sched.health}
                                                </div>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid var(--border-light)', paddingLeft: '24px' }}>
                                                <button onClick={() => handleOpenModal(sched)} style={{ background: 'white', border: '1px solid var(--border-light)', color: 'var(--secondary-600)', cursor: 'pointer', padding: '10px', borderRadius: '10px' }} className="hover-scale hover-bg-light" title="Edit Jadwal">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(sched.id)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: 'var(--danger-600)', cursor: 'pointer', padding: '10px', borderRadius: '10px' }} className="hover-scale" title="Hapus Jadwal">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {schedules.length === 0 && (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary-500)', fontSize: '15px' }}>
                                Belum ada jadwal onsite yang terdaftar.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- MODAL FORM --- */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '640px', maxWidth: '95%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ backgroundColor: 'var(--primary-100)', padding: '10px', borderRadius: '12px', color: 'var(--primary-600)' }}>
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--secondary-900)', margin: '0 0 4px 0' }}>
                                        {editingId ? 'Edit Jadwal Penugasan' : 'Jadwal Penugasan Baru'}
                                    </h2>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--secondary-500)' }}>
                                        Lengkapi formulir di bawah ini untuk mengatur penugasan tim lapangan.
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'white', border: '1px solid var(--border-light)', color: 'var(--secondary-500)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover-scale">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                            {/* Personel Custom Dropdown */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyles}>Personel (PIC) <span style={{color: 'red'}}>*</span></label>
                                <div style={{ position: 'relative' }} ref={dropdownRef}>
                                    <div 
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        style={{ ...inputStyles, minHeight: '48px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        {formData.pic_names.length === 0 ? (
                                            <span style={{ color: 'var(--secondary-400)' }}>Pilih anggota tim...</span>
                                        ) : (
                                            formData.pic_names.map(name => (
                                                <span key={name} style={{ backgroundColor: 'white', border: '1px solid var(--border-light)', padding: '4px 10px', borderRadius: '16px', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-800)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {name}
                                                    <div 
                                                        onClick={(e) => { e.stopPropagation(); togglePicSelection(name); }}
                                                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--secondary-400)' }}
                                                    >
                                                        <X size={14} />
                                                    </div>
                                                </span>
                                            ))
                                        )}
                                        <ChevronDown size={18} color="var(--secondary-400)" style={{ marginLeft: 'auto' }} />
                                    </div>
                                    
                                    {isDropdownOpen && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                                            {users.map(u => {
                                                const isSelected = formData.pic_names.includes(u.full_name);
                                                return (
                                                    <div 
                                                        key={u.id}
                                                        onClick={() => togglePicSelection(u.full_name)}
                                                        style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: isSelected ? 'var(--primary-50)' : 'white' }}
                                                        className="hover-bg-light"
                                                    >
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: isSelected ? 'none' : '1px solid var(--border-light)', backgroundColor: isSelected ? 'var(--primary-500)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isSelected && <Check size={14} color="white" />}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary-900)' }}>{u.full_name}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--secondary-500)' }}>{u.role}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyles}>Tanggal Berangkat <span style={{color: 'red'}}>*</span></label>
                                    <input 
                                        type="date" 
                                        name="start_date" 
                                        value={formData.start_date} 
                                        onChange={handleInputChange} 
                                        style={inputStyles}
                                        required
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyles}>Tanggal Selesai <span style={{color: 'red'}}>*</span></label>
                                    <input 
                                        type="date" 
                                        name="end_date" 
                                        value={formData.end_date} 
                                        onChange={handleInputChange} 
                                        style={inputStyles}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyles}>Lokasi Project / Klien <span style={{color: 'red'}}>*</span></label>
                                <input 
                                    type="text" 
                                    name="location" 
                                    placeholder="Contoh: RS Setia Mitra"
                                    value={formData.location} 
                                    onChange={handleInputChange} 
                                    style={inputStyles}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyles}>Status Kehadiran</label>
                                    <select 
                                        name="status" 
                                        value={formData.status} 
                                        onChange={handleInputChange}
                                        style={inputStyles}
                                    >
                                        <option value="Tiba">📍 Tiba di Lokasi</option>
                                        <option value="Perjalanan">🚗 Dalam Perjalanan</option>
                                        <option value="Pulang">🏠 Pulang</option>
                                        <option value="Selesai">✅ Selesai</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyles}>Health Score</label>
                                    <select 
                                        name="health" 
                                        value={formData.health} 
                                        onChange={handleInputChange}
                                        style={inputStyles}
                                    >
                                        <option value="On Track">✅ On Track</option>
                                        <option value="At Risk">⚠️ At Risk</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', backgroundColor: 'white', color: 'var(--secondary-600)', border: '1px solid var(--border-light)', cursor: 'pointer' }} className="hover-scale">
                                    Batal
                                </button>
                                <button type="submit" style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', backgroundColor: 'var(--primary-600)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} className="hover-scale">
                                    {editingId ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                                    {editingId ? 'Simpan Perubahan' : 'Tambah Jadwal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <style>{`
                .hover-bg-light:hover { background-color: #f8fafc !important; }
            `}</style>
        </div>
    );
};

export default JadwalOnsitePage;
