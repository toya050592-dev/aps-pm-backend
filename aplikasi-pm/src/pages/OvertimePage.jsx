import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, Plus, CheckCircle2, ShieldCheck, Download, AlertCircle, FileImage, Trash2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { admedikaLogoBase64 } from '../assets/admedikaLogoBase64';

const API_URL = '';

const DEPARTMENTS = ['Engineering', 'Sales', 'Support', 'PMO', 'Marketing', 'BUSOL'];

// Helper to calculate hours between two times (HH:MM)
const calculateHours = (start, end) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (diff < 0) diff += 24; // Cross midnight
    return diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
};

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
};

export default function OvertimePage({ currentUser }) {
    const [requests, setRequests] = useState([]);
    const [users, setUsers] = useState([]);
    
    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        user_id: currentUser?.id || '',
        department: 'BUSOL',
        overtime_date: '',
        is_holiday: false,
        start_time: '',
        end_time: '',
        hours: '',
        reason: '',
        evidence: null
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportSelectedUser, setExportSelectedUser] = useState('');
    const [exportMonth, setExportMonth] = useState('Semua');
    const [displayMonth, setDisplayMonth] = useState(new Date().getMonth().toString());
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);

    const filteredRequests = useMemo(() => {
        if (displayMonth === 'Semua') return requests;
        const currentYear = new Date().getFullYear();
        return requests.filter(r => {
            if (!r.overtime_date) return false;
            const d = new Date(r.overtime_date);
            return d.getMonth() === parseInt(displayMonth) && d.getFullYear() === currentYear;
        });
    }, [requests, displayMonth]);

    const showSuccess = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    useEffect(() => {
        fetchRequests();
        fetchUsers();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_URL}/api/overtime`);
            if (res.ok) {
                setRequests(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/users`);
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, evidence: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });

            const res = await fetch(`${API_URL}/api/overtime`, {
                method: 'POST',
                body: data
            });

            if (res.ok) {
                await fetchRequests();
                setShowForm(false);
                setFormData({
                    user_id: currentUser?.id || '',
                    department: 'BUSOL',
                    overtime_date: '',
                    is_holiday: false,
                    start_time: '',
                    end_time: '',
                    hours: '',
                    reason: '',
                    evidence: null
                });
                showSuccess('Pengajuan lembur berhasil dikirim!');
            } else {
                alert('Gagal mengajukan lembur.');
            }
        } catch (err) {
            console.error(err);
            alert('Kesalahan jaringan.');
        }
        setIsSubmitting(false);
    };

    const handleApprove = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/overtime/${id}/approve`, {
                method: 'PUT'
            });
            if (res.ok) {
                await fetchRequests();
                showSuccess('Pengajuan lembur disetujui.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus data pengajuan lembur ini?")) return;
        try {
            const res = await fetch(`${API_URL}/api/overtime/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                await fetchRequests();
                showSuccess('Pengajuan lembur berhasil dihapus.');
            } else {
                alert('Gagal menghapus pengajuan lembur.');
            }
        } catch (err) {
            console.error(err);
            alert('Kesalahan jaringan.');
        }
    };

    // Chart Data
    const chartData = useMemo(() => {
        const stats = {};
        filteredRequests.filter(r => r.status === 'Approved').forEach(r => {
            const empName = r.user_name || 'Unknown';
            if (!stats[empName]) stats[empName] = 0;
            stats[empName] += parseFloat(r.hours || 0) * (r.is_holiday ? 2 : 1);
        });
        return Object.keys(stats).map(key => ({
            employee_name: key,
            hours: parseFloat(stats[key].toFixed(2))
        })).sort((a, b) => b.hours - a.hours);
    }, [filteredRequests]);

    const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
    };

    const uniqueUsers = useMemo(() => {
        const userMap = new Map();
        requests.forEach(r => {
            if (r.user_name) {
                userMap.set(r.user_name, { name: r.user_name, department: r.department });
            }
        });
        return Array.from(userMap.values());
    }, [requests]);

    // Generate Excel with layout matching PDF requirements
    const generateExcel = async () => {
        let userRequests = requests;
        
        if (exportMonth !== 'Semua') {
            const currentYear = new Date().getFullYear();
            userRequests = userRequests.filter(r => {
                if (!r.overtime_date) return false;
                const d = new Date(r.overtime_date);
                return d.getMonth() === parseInt(exportMonth) && d.getFullYear() === currentYear;
            });
        }

        let selectedName = "Semua Karyawan";
        let picNik = "-";
        let picJabatan = "-";
        
        if (exportSelectedUser) {
            userRequests = userRequests.filter(r => r.user_name === exportSelectedUser);
            selectedName = exportSelectedUser;
            const picUser = users.find(u => u.full_name === exportSelectedUser);
            if (picUser) {
                picNik = picUser.nik || "-";
                picJabatan = picUser.jabatan || "-";
            }
        }
        
        const approverUser = users.find(u => u.full_name === 'M Nurcholis Wicaksono');
        const approverJabatan = approverUser?.jabatan || "-";

        const totalHours = userRequests.reduce((sum, r) => sum + (parseFloat(r.hours || 0) * (r.is_holiday ? 2 : 1)), 0);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Data Lembur', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        // Logo / Title
        sheet.mergeCells('D1:G2');
        const titleCell = sheet.getCell('D1');
        titleCell.value = "DETAIL DATA LEMBUR";
        titleCell.font = { bold: true, size: 14 };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Add Logo Image
        const imageId = workbook.addImage({
            base64: admedikaLogoBase64,
            extension: 'png',
        });
        sheet.addImage(imageId, {
            tl: { col: 0, row: 0, colOff: 5, rowOff: 5 },
            br: { col: 2, row: 2, colOff: 0, rowOff: 0 }
        });

        // Header Meta
        const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' });
        
        sheet.getCell('A4').value = "NIK";
        sheet.getCell('B4').value = `: ${picNik}`;
        
        sheet.getCell('A5').value = "Nama Karyawan";
        sheet.getCell('B5').value = `: ${selectedName}`;
        
        sheet.getCell('A6').value = "Bulan";
        sheet.getCell('B6').value = `: ${currentMonth}`;
        
        sheet.getCell('A7').value = "Divisi";
        sheet.getCell('B7').value = `: MNB`;
        
        sheet.getCell('A8').value = "Dept.";
        sheet.getCell('B8').value = `: BUSOL`;
        
        sheet.getCell('A9').value = "Unit";
        sheet.getCell('B9').value = `: Service Delivery`;

        // Table Headers
        const startRow = 11;
        const headers = [
            "NO", "TANGGAL LEMBUR\n(MM/DD/YYYY)", "LEMBUR DI HARI\nLIBUR / HARI KERJA", 
            "JAM MULAI\nLEMBUR\n(HH:MM)", "JAM AKHIR\nLEMBUR\n(HH:MM)", 
            "JUMLAH JAM\nLEMBUR", "DESKRIPSI PEKERJAAN LEMBUR"
        ];
        
        const headerRow = sheet.getRow(startRow);
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        headerRow.height = 45;

        // Data Rows
        let currentRow = startRow + 1;
        userRequests.forEach((req, idx) => {
            const row = sheet.getRow(currentRow);
            
            row.getCell(1).value = idx + 1;
            
            const dateStr = new Date(req.overtime_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            row.getCell(2).value = dateStr.replace('.', '');
            
            row.getCell(3).value = req.is_holiday ? "LIBUR" : "HARI KERJA";
            row.getCell(4).value = req.start_time?.slice(0, 5) || '-';
            row.getCell(5).value = req.end_time?.slice(0, 5) || '-';
            row.getCell(6).value = parseFloat((parseFloat(req.hours || 0) * (req.is_holiday ? 2 : 1)).toFixed(2));
            row.getCell(7).value = req.reason || '-';

            [1,2,3,4,5,6].forEach(c => {
                row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
            });
            row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };

            for(let i=1; i<=7; i++) {
                row.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            }
            
            currentRow++;
        });

        // Add empty rows if needed
        const minRows = 12;
        const addedRows = userRequests.length;
        for(let i = 0; i < (minRows - addedRows); i++) {
            const row = sheet.getRow(currentRow);
            for(let j=1; j<=7; j++) {
                row.getCell(j).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            }
            currentRow++;
        }

        // TOTAL row
        const totalRow = sheet.getRow(currentRow);
        sheet.mergeCells(`A${currentRow}:E${currentRow}`);
        const totalLabelCell = totalRow.getCell(1);
        totalLabelCell.value = "TOTAL";
        totalLabelCell.font = { bold: true };
        totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        
        const totalHoursCell = totalRow.getCell(6);
        totalHoursCell.value = `${totalHours} Jam`;
        totalHoursCell.font = { bold: true };
        totalHoursCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalHoursCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        
        totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        
        for(let i=1; i<=7; i++) {
            totalRow.getCell(i).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        }

        currentRow += 2;
        sheet.getCell(`A${currentRow}`).value = "Catatan :";
        sheet.getCell(`A${currentRow}`).font = { italic: true };
        currentRow++;
        sheet.getCell(`A${currentRow}`).value = "1  Lampirkan evidence kegiatan lembur setiap tanggalnya";
        sheet.getCell(`A${currentRow}`).font = { italic: true };
        currentRow++;
        sheet.getCell(`A${currentRow}`).value = "2  Penyetuju minimal level Manager (Atasan Struktural)";
        sheet.getCell(`A${currentRow}`).font = { italic: true };

        currentRow += 3;
        sheet.getCell(`A${currentRow}`).value = "Diajukan oleh :";
        sheet.getCell(`A${currentRow}`).font = { bold: true };
        
        sheet.getCell(`E${currentRow}`).value = "Disetujui oleh :";
        sheet.getCell(`E${currentRow}`).font = { bold: true };
        
        currentRow += 4;
        sheet.getCell(`A${currentRow}`).value = `Nama : ${selectedName}`;
        sheet.getCell(`A${currentRow}`).font = { bold: true, italic: true };
        sheet.getCell(`E${currentRow}`).value = `Nama : M Nurcholis Wicaksono`;
        sheet.getCell(`E${currentRow}`).font = { bold: true, italic: true };
        
        currentRow++;
        sheet.getCell(`A${currentRow}`).value = `Jabatan : ${picJabatan}`;
        sheet.getCell(`A${currentRow}`).font = { bold: true, italic: true };
        sheet.getCell(`E${currentRow}`).value = `Jabatan : ${approverJabatan}`;
        sheet.getCell(`E${currentRow}`).font = { bold: true, italic: true };

        // Set Column Widths
        sheet.getColumn(1).width = 5;
        sheet.getColumn(2).width = 22;
        sheet.getColumn(3).width = 22;
        sheet.getColumn(4).width = 15;
        sheet.getColumn(5).width = 15;
        sheet.getColumn(6).width = 15;
        sheet.getColumn(7).width = 60;

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Laporan_Lembur_${selectedName.replace(/\s+/g, '_')}.xlsx`);
        
        setShowExportModal(false);
    };

    return (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            {toastMessage && (
                <div style={{ backgroundColor: 'var(--success-bg)', border: '1px solid #86efac', color: 'var(--success-text)', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <CheckCircle2 size={20} /> {toastMessage}
                </div>
            )}

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--secondary-900)', letterSpacing: '-0.5px' }}>
                        Overtime (Lembur)
                    </h1>
                    <p style={{ color: 'var(--secondary-500)', fontSize: '15px', marginTop: '6px' }}>
                        Ajukan, pantau, dan kelola permintaan lembur tim secara efisien.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select 
                        className="modern-select" 
                        value={displayMonth}
                        onChange={e => setDisplayMonth(e.target.value)}
                        style={{ height: '40px', padding: '0 12px' }}
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
                    <button onClick={() => setShowExportModal(true)} className="modern-btn" style={{ background: '#10b981', color: '#fff', border: '1px solid #059669', height: '40px' }}>
                        <Download size={16} style={{ marginRight: '6px' }} />
                        Ekspor Excel
                    </button>
                    <button onClick={() => setShowForm(!showForm)} className="modern-btn modern-btn-primary" style={{ height: '40px' }}>
                        <Plus size={16} style={{ marginRight: '6px' }} />
                        Ajukan Lembur
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
                
                {/* Export Excel Modal */}
                {showExportModal && (
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
                                <button onClick={() => setShowExportModal(false)} className="modern-btn" style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1' }}>Batal</button>
                                <button onClick={generateExcel} className="modern-btn modern-btn-primary" style={{ background: '#10b981', border: 'none' }}>Ekspor Excel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Pengajuan Lembur */}
                {showForm && (
                    <div className="modern-card" style={{ flex: '1', minWidth: '320px', animation: 'slideDown 0.3s ease-out' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--secondary-800)' }}>Form Pengajuan Lembur</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-700)', marginBottom: '6px' }}>Nama Personel</label>
                                <select 
                                    className="modern-select" 
                                    style={{ width: '100%' }}
                                    value={formData.user_id}
                                    onChange={e => setFormData({...formData, user_id: e.target.value})}
                                    required
                                >
                                    <option value="">-- Pilih Personel --</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-700)', marginBottom: '6px' }}>Departemen / Divisi</label>
                                    <select 
                                        className="modern-select" 
                                        style={{ width: '100%' }}
                                        value={formData.department}
                                        onChange={e => setFormData({...formData, department: e.target.value})}
                                    >
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-700)', marginBottom: '6px' }}>Hari Kerja / Libur</label>
                                    <select 
                                        className="modern-select" 
                                        style={{ width: '100%' }}
                                        value={formData.is_holiday}
                                        onChange={e => setFormData({...formData, is_holiday: e.target.value === 'true'})}
                                    >
                                        <option value="false">Hari Kerja</option>
                                        <option value="true">Hari Libur</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-700)', marginBottom: '6px' }}>Tanggal Lembur</label>
                                <input 
                                    type="date" 
                                    className="modern-input" 
                                    style={{ width: '100%' }}
                                    value={formData.overtime_date}
                                    onChange={e => setFormData({...formData, overtime_date: e.target.value})}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-700)', marginBottom: '6px' }}>Jam Mulai</label>
                                    <input 
                                        type="time" 
                                        className="modern-input" 
                                        style={{ width: '100%' }}
                                        value={formData.start_time}
                                        onChange={e => {
                                            const st = e.target.value;
                                            const hrs = calculateHours(st, formData.end_time);
                                            setFormData({...formData, start_time: st, hours: hrs > 0 ? hrs : formData.hours});
                                        }}
                                        required
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-700)', marginBottom: '6px' }}>Jam Akhir</label>
                                    <input 
                                        type="time" 
                                        className="modern-input" 
                                        style={{ width: '100%' }}
                                        value={formData.end_time}
                                        onChange={e => {
                                            const et = e.target.value;
                                            const hrs = calculateHours(formData.start_time, et);
                                            setFormData({...formData, end_time: et, hours: hrs > 0 ? hrs : formData.hours});
                                        }}
                                        required
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-700)', marginBottom: '6px' }}>Jumlah Jam</label>
                                    <input 
                                        type="number" 
                                        step="0.5"
                                        className="modern-input" 
                                        style={{ width: '100%', backgroundColor: '#f8fafc' }}
                                        value={formData.hours}
                                        onChange={e => setFormData({...formData, hours: e.target.value})}
                                        placeholder="0"
                                        readOnly
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-700)', marginBottom: '6px' }}>Deskripsi Pekerjaan</label>
                                <textarea 
                                    className="modern-input" 
                                    style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                                    placeholder="Contoh: Pendampingan UAT Bispro..."
                                    value={formData.reason}
                                    onChange={e => setFormData({...formData, reason: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--secondary-700)', marginBottom: '6px' }}>Evidence (Foto/Dokumen)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <label className="modern-btn" style={{ background: '#f1f5f9', color: '#475569', border: '1px dashed #cbd5e1', cursor: 'pointer', flex: 1, textAlign: 'center' }}>
                                        <FileImage size={16} style={{ marginRight: '8px' }} />
                                        {formData.evidence ? formData.evidence.name : 'Pilih File / Unggah'}
                                        <input type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" className="modern-btn modern-btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                                    {isSubmitting ? 'Menyimpan...' : 'Kirim Pengajuan'}
                                </button>
                                <button type="button" onClick={() => setShowForm(false)} className="modern-btn" style={{ flex: 1, background: '#f1f5f9', color: '#64748b' }}>
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Mini Bar Chart */}
                <div className="modern-card" style={{ flex: '1', minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px', color: 'var(--secondary-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} color="var(--primary-600)" /> Jumlah Jam Lembur (Approved) per Karyawan
                    </h3>
                    <div style={{ flex: 1, minHeight: '250px', width: '100%' }}>
                        {chartData.length > 0 && chartData.some(d => d.hours > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="employee_name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                                <AlertCircle size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
                                <p style={{ fontSize: '14px' }}>Belum ada data lembur.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Requests */}
            <div className="modern-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--secondary-800)', margin: 0 }}>Daftar Pengajuan Lembur</h3>
                </div>
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
                        {filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--secondary-500)' }}>
                                    Tidak ada data pengajuan lembur untuk bulan ini.
                                </td>
                            </tr>
                        ) : filteredRequests.map(req => (
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
                                            <button onClick={() => setPhotoPreviewUrl(`${API_URL}${req.evidence_url}`)} className="modern-btn" style={{ padding: '6px', background: '#e0f2fe', color: '#0284c7', border: 'none' }} title="Lihat Foto">
                                                <FileImage size={16} />
                                            </button>
                                        )}
                                        {req.status === 'Pending' && (currentUser?.role === 'Admin' || (currentUser?.permissions || []).includes('approve_overtime')) && (
                                            <button 
                                                onClick={() => handleApprove(req.id)}
                                                className="modern-btn" 
                                                style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--primary-600)', color: 'white' }}
                                            >
                                                <ShieldCheck size={14} style={{ marginRight: '4px' }} /> Setujui
                                            </button>
                                        )}
                                        {(currentUser?.role === 'Admin' || (currentUser?.permissions || []).includes('approve_overtime')) && (
                                            <button 
                                                onClick={() => handleDelete(req.id)}
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
            </div>

            {/* Photo Preview Modal */}
            {photoPreviewUrl && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setPhotoPreviewUrl(null)}>
                    <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setPhotoPreviewUrl(null)}
                            style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: 'white', fontSize: '32px', cursor: 'pointer', zIndex: 1001 }}
                        >
                            &times;
                        </button>
                        <img src={photoPreviewUrl} alt="Evidence" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} />
                    </div>
                </div>
            )}
        </div>
    );
}
