import React from 'react';
import { Edit2, Trash2, MessageSquare, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function DocumentTable({ 
    documents, 
    currentPage, 
    setCurrentPage, 
    itemsPerPage, 
    totalPages, 
    getStatusBadge, 
    onEdit, 
    onEditKeterangan, 
    onDelete 
}) {
    return (<>
            {/* Table */}
            <div className="doc-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Detail Pengajuan</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Kebutuhan</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Vendor & Nilai PO</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Status</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Pembaruan Terakhir</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Keterangan</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center' }}>Loading...</td></tr> :
                             documents.length === 0 ? <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Tidak ada data dokumen ditemukan.</td></tr> :
                             paginatedDocs.map((doc) => (
                                <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{doc.no_pengajuan || '-'}</div>
                                        <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b', marginTop: '2px' }}>{doc.nama_project || 'Tanpa Nama Project'}</div>
                                        <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#94a3b8', marginTop: '4px' }}>
                                            Tgl: {doc.pm_date ? new Date(doc.pm_date).toLocaleDateString('id-ID') : '-'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontSize: '13px', color: '#334155', maxWidth: '250px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.kebutuhan}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{doc.vendor_name || '-'}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{formatRupiah(doc.nilai_final || doc.nilai_estimasi)}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>{getStatusBadge(doc.status)}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
                                            {doc.last_updated_at ? new Date(doc.last_updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Oleh {doc.last_updated_by || '-'}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontSize: '13px', color: '#334155', maxWidth: '200px' }}>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.keterangan || '-'}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            <button className="btn-icon-action" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }} onClick={() => {() => onEditKeterangan(doc)}} title="Edit Keterangan">
                                                <MessageSquare size={16} />
                                            </button>
                                            <button className="btn-icon-action edit" onClick={() => onEdit(doc)} title="Lihat Detail / Edit">
                                                <FileText size={16} />
                                            </button>
                                            <button className="btn-icon-action delete" onClick={() => onDelete(doc.id)} title="Hapus Dokumen">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                Menampilkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, documents.length)} dari {documents.length} dokumen
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: currentPage === 1 ? '#f8fafc' : '#ffffff', color: currentPage === 1 ? '#cbd5e1' : '#475569', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}>
                                    Sebelumnya
                                </button>
                                <button 
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: currentPage === totalPages ? '#f8fafc' : '#ffffff', color: currentPage === totalPages ? '#cbd5e1' : '#475569', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}>
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}
                </div>
    </div></>);
}
