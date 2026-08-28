import React from 'react';
import { Plus } from 'lucide-react';

export default function OvertimeForm({ 
    showForm, 
    handleSubmit, 
    formData, 
    setFormData, 
    users, 
    isSubmitting 
}) {
    if (!showForm) return null;

    return (
        <div style={{ flex: '1', minWidth: '320px', animation: 'slideDown 0.3s ease-out' }}>

                
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
        </div>
    );
}
