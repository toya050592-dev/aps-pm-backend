import React from 'react';
import { MessageSquare, X, Check } from 'lucide-react';

export default function KeteranganModal({ showKetModal, setShowKetModal, ketData, setKetData, handleSaveKeterangan }) {
    if (!showKetModal) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                            <MessageSquare size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Catatan Pengajuan</h3>
                    </div>
                    <button onClick={() => setShowKetModal(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}><X size={18} /></button>
                </div>
                <div style={{ padding: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Keterangan / Pesan Tambahan</label>
                    <textarea 
                        className="doc-input" 
                        style={{ minHeight: '130px', resize: 'vertical', width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', lineHeight: '1.5', color: '#334155', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }} 
                        value={ketData.keterangan || ''} 
                        onChange={(e) => setKetData({ ...ketData, keterangan: e.target.value })} 
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#4338ca'; e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(67,56,202,0.1)'; }} 
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }} 
                        placeholder="Tuliskan catatan atau keterangan detail di sini..." 
                    />
                </div>
                <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={() => setShowKetModal(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '600', color: '#475569', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}>Batal</button>
                    <button onClick={handleSaveKeterangan} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#4338ca', color: '#fff', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(67, 56, 202, 0.2)' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3730a3'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}><Check size={18} /> Simpan Catatan</button>
                </div>
            </div>
        </div>
    );
}
