import React from 'react';

export default function PhotoPreviewModal({ photoUrl, onClose }) {
    if (!photoUrl) return null;

    return (
        <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} 
            onClick={onClose}
        >
            <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: 'white', fontSize: '32px', cursor: 'pointer', zIndex: 1001 }}
                >
                    &times;
                </button>
                <img 
                    src={photoUrl} 
                    alt="Evidence" 
                    style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
                />
            </div>
        </div>
    );
}
