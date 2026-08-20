const fs = require('fs');
let content = fs.readFileSync('d:/PROJECT APS PM/aplikasi-pm/src/components/GanttChart.jsx', 'utf8');

const targetStr = `                <div style={{ display: 'flex', gap: '24px' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Project Manager</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981' }}><i data-lucide="user"></i></span>
                            {project?.pic_name || 'Haryanto'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Company Name</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981' }}><i data-lucide="building"></i></span>
                            {project?.name || 'Project Name'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981' }}><i data-lucide="calendar"></i></span>
                            {formatDate(new Date())}
                        </div>
                    </div>
                </div>`;
                
const replaceWith = `                <div style={{ display: 'flex', gap: '24px' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Project Manager</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981' }}><i data-lucide="user"></i></span>
                            {project?.pic_name || '-'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Project Name</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981' }}><i data-lucide="building"></i></span>
                            {project?.project_name || 'Project Name'}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date</div>
                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#10b981' }}><i data-lucide="calendar"></i></span>
                            {formatDate(new Date())}
                        </div>
                    </div>
                </div>`;

const normalize = (str) => str.replace(/\r\n/g, '\n');

content = normalize(content).replace(normalize(targetStr), replaceWith);

fs.writeFileSync('d:/PROJECT APS PM/aplikasi-pm/src/components/GanttChart.jsx', content);
console.log('Fixed GanttChart.jsx property name');
