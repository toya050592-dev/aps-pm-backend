import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, Plus, CheckCircle2, ShieldCheck, Download, AlertCircle, FileImage, Trash2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { admedikaLogoBase64 } from '../assets/admedikaLogoBase64';
import ExportModal from '../components/Overtime/ExportModal';
import OvertimeForm from '../components/Overtime/OvertimeForm';
import OvertimeTable from '../components/Overtime/OvertimeTable';
import PhotoPreviewModal from '../components/Overtime/PhotoPreviewModal';

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
                
                <ExportModal 
                    isOpen={showExportModal} 
                    onClose={() => setShowExportModal(false)}
                    uniqueUsers={uniqueUsers}
                    exportSelectedUser={exportSelectedUser}
                    setExportSelectedUser={setExportSelectedUser}
                    exportMonth={exportMonth}
                    setExportMonth={setExportMonth}
                    onExport={generateExcel}
                />

                <OvertimeForm 
                    showForm={showForm}
                    handleSubmit={handleSubmit}
                    formData={formData}
                    setFormData={setFormData}
                    users={users}
                    isSubmitting={isSubmitting}
                />

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
                <OvertimeTable 
                    requests={filteredRequests}
                    role={currentUser?.role}
                    onApprove={(id, status) => handleApprove(id, status)}
                    onDelete={handleDelete}
                    onPhotoClick={setPhotoPreviewUrl}
                />
            </div>

            <PhotoPreviewModal photoUrl={photoPreviewUrl} onClose={() => setPhotoPreviewUrl(null)} />
        </div>
    );
}
