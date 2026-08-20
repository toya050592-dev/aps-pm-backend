const fs = require('fs');
let content = fs.readFileSync('d:/PROJECT APS PM/aplikasi-pm/src/components/GanttChart.jsx', 'utf8');

// The incorrect diff replaced all of this with just the span and project?.name
content = content.replace(/                        <div style=\{\{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' \}\}>\r?\n                            <span style=\{\{ color: '#10b981' \}\}\><i data-lucide="building"><\/i><\/span>\r?\n                            \{project\?\.name \|\| 'Project Name'\}\r?\n                        <\/div>/, `                        <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                        </div>`);

fs.writeFileSync('d:/PROJECT APS PM/aplikasi-pm/src/components/GanttChart.jsx', content);
console.log('Fixed GanttChart.jsx');
