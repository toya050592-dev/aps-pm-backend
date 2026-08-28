const fs = require('fs');

let c = fs.readFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', 'utf8');

if (!c.includes('documentService')) {
    c = c.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { documentService } from '../services/documentService';\nimport { handoverService } from '../services/handoverService';\nimport { masterDataService } from '../services/masterDataService';\nimport { userService } from '../services/userService';"
    );
}

const oldFetchData = `            const [docRes, masterRes, usersRes] = await Promise.all([
                fetch(\`\${API_URL}/api/document-tracking\`),
                fetch(\`\${API_URL}/api/master-data\`),
                fetch(\`\${API_URL}/api/users\`)
            ]);
            if (docRes.ok) setDocuments(await docRes.json());
            if (masterRes.ok) {
                const master = await masterRes.json();
                setVendors(master.filter(m => m.type && m.type.toUpperCase() === 'NAMA_VENDOR'));
                setMarketingPics(master.filter(m => m.type && m.type.toUpperCase() === 'MARKETING'));
            }
            if (usersRes.ok) setUsers(await usersRes.json());`;
const newFetchData = `            const [docData, vendorData, marketingData, usersData] = await Promise.all([
                documentService.getAll(),
                masterDataService.getByType('NAMA_VENDOR'),
                masterDataService.getByType('MARKETING'),
                userService.getAllUsers()
            ]);
            setDocuments(docData);
            setVendors(vendorData);
            setMarketingPics(marketingData);
            setUsers(usersData);`;
c = c.replace(oldFetchData, newFetchData);

const oldHistory = `const hRes = await fetch(\`\${API_URL}/api/handovers/\${doc.id}\`);
            if (hRes.ok) {
                const hData = await hRes.json();
                setHistoryList(hData);
            }`;
const newHistory = `const hData = await handoverService.getHistoryByDocId(doc.id);
            setHistoryList(hData);`;
c = c.replace(oldHistory, newHistory);

const oldKet = `const res = await fetch(\`\${API_URL}/api/document-tracking/\${ketData.id}/keterangan\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keterangan_update: ketData.keterangan_update })
            });
            if (res.ok) {
                showToast('Keterangan berhasil diupdate!', 'success');
                setShowKetModal(false);
                fetchData();
            } else {
                showToast('Gagal mengupdate keterangan', 'error');
            }`;
const newKet = `await documentService.updateKeterangan(ketData.id, { keterangan_update: ketData.keterangan_update });
            showToast('Keterangan berhasil diupdate!', 'success');
            setShowKetModal(false);
            fetchData();`;
c = c.replace(oldKet, newKet);

const oldSaveHandover = `const res = await fetch(\`\${API_URL}/api/handovers\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(handoverData)
            });
            if (res.ok) {
                showToast('Handover berhasil ditambahkan!', 'success');
                setShowHandoverModal(false);
                setHandoverData({ doc_id: '', from_user: '', to_user: '', notes: '' });
                // Refresh history modal jika sedang terbuka
                const hRes = await fetch(\`\${API_URL}/api/handovers/\${selectedDoc.id}\`);
                if (hRes.ok) setHistoryList(await hRes.json());
            } else {
                showToast('Gagal menambah handover', 'error');
            }`;
const newSaveHandover = `await handoverService.create(handoverData);
            showToast('Handover berhasil ditambahkan!', 'success');
            setShowHandoverModal(false);
            setHandoverData({ doc_id: '', from_user: '', to_user: '', notes: '' });
            setHistoryList(await handoverService.getHistoryByDocId(selectedDoc.id));`;
c = c.replace(oldSaveHandover, newSaveHandover);
c = c.replace(/catch \(error\) \{\s*console\.error\(error\);\s*showToast\('Terjadi kesalahan', 'error'\);\s*\}/g,
    "catch (error) { console.error(error); showToast(error.message || 'Terjadi kesalahan', 'error'); }");


const oldReceive = `const res = await fetch(\`\${API_URL}/api/handovers/\${id}/receive\`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ received_by: currentUser.full_name })
            });
            if (res.ok) {
                showToast('Dokumen berhasil diterima', 'success');
                // Refresh history list
                const updatedList = historyList.map(h => {
                    if (h.id === id) {
                        return { ...h, status: 'RECEIVED', received_at: new Date().toISOString(), received_by: currentUser.full_name };
                    }
                    return h;
                });
                setHistoryList(updatedList);
            } else {
                showToast('Gagal mengupdate status', 'error');
            }`;
const newReceive = `await handoverService.receive(id, { received_by: currentUser.full_name });
            showToast('Dokumen berhasil diterima', 'success');
            const updatedList = historyList.map(h => h.id === id ? { ...h, status: 'RECEIVED', received_at: new Date().toISOString(), received_by: currentUser.full_name } : h);
            setHistoryList(updatedList);`;
c = c.replace(oldReceive, newReceive);

const oldSaveDoc = `const response = await fetch(url, {
                method,
                body: formDataObj
            });
            const data = await response.json();
            if (response.ok) {
                showToast('Data berhasil disimpan!', 'success');
                handleCloseModal();
                fetchData();
            } else {
                showToast(data.error || 'Gagal menyimpan data', 'error');
            }`;
const newSaveDoc = `if (selectedDoc) {
                await documentService.update(selectedDoc.id, formDataObj);
            } else {
                await documentService.create(formDataObj);
            }
            showToast('Data berhasil disimpan!', 'success');
            handleCloseModal();
            fetchData();`;
c = c.replace(oldSaveDoc, newSaveDoc);

const oldDel = `const response = await fetch(\`\${API_URL}/api/document-tracking/\${id}\`, { method: 'DELETE' });
            if (response.ok) {
                showToast('Dokumen berhasil dihapus!', 'success');
                fetchData();
            } else {
                showToast('Gagal menghapus dokumen', 'error');
            }`;
const newDel = `await documentService.delete(id);
            showToast('Dokumen berhasil dihapus!', 'success');
            fetchData();`;
c = c.replace(oldDel, newDel);

fs.writeFileSync('aplikasi-pm/src/pages/DocumentTracking.jsx', c);
console.log('DocumentTracking refactored!');
