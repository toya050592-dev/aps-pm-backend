const fs = require('fs');

let content = fs.readFileSync('d:\\PROJECT APS PM\\aplikasi-pm\\src\\App.jsx', 'utf8');

// 1. Add editProjectPicId state
const statePattern = "const [editProjectStatus, setEditProjectStatus] = useState('');";
const stateReplacement = "const [editProjectStatus, setEditProjectStatus] = useState('');\n    const [editProjectPicId, setEditProjectPicId] = useState('');";
content = content.replace(statePattern, stateReplacement);

// 2. Add setEditProjectPicId to startEditProject
const startEditPattern = "setEditProjectStatus(proj.status || '');";
const startEditReplacement = "setEditProjectStatus(proj.status || '');\n        setEditProjectPicId(proj.pic_user_id || '');";
content = content.replace(startEditPattern, startEditReplacement);

// 3. Add pic_user_id to saveEditProject
const saveEditPattern = "actual_end_date: editProjectStatus === 'Completed' ? editProjectCompletedDate : null";
const saveEditReplacement = "actual_end_date: editProjectStatus === 'Completed' ? editProjectCompletedDate : null,\n                    pic_user_id: editProjectPicId || null";
content = content.replace(saveEditPattern, saveEditReplacement);

// 4. Update the PIC rendering in the table
const tdPattern = "<td>{proj.pic_name || '-'}</td>";
const tdReplacement = `<td>
                                                    {editingProjectId === proj.id && currentUser.role === 'Admin' ? (
                                                        <select className="modern-select" value={editProjectPicId} onChange={(e) => setEditProjectPicId(e.target.value)} style={{ width: '130px' }}>
                                                            <option value="">-- Pilih PIC --</option>
                                                            {users.filter(u => u.is_active).map(u => (
                                                                <option key={u.id} value={u.id}>{u.full_name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        proj.pic_name || '-'
                                                    )}
                                                </td>`;
content = content.replace(tdPattern, tdReplacement);

fs.writeFileSync('d:\\PROJECT APS PM\\aplikasi-pm\\src\\App.jsx', content);
console.log("App.jsx patched successfully.");
