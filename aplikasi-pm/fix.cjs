const fs = require('fs');
let content = fs.readFileSync('d:/PROJECT APS PM/aplikasi-pm/src/App.jsx', 'utf8');

content = content.replace(/            setProjects\(await response\.json\(\)\);/, `    useEffect(() => {
        fetchProjects();
        fetchUsers();
        fetchMasterData();
    }, []);

    const fetchMasterData = async () => {
        try {
            const resProd = await fetch(\`\${API_URL}/api/master-data?type=JENIS_PRODUK\`);
            if (resProd.ok) {
                const data = await resProd.json();
                setProductTypes(data.filter(d => d.is_active));
            }
            const resStatus = await fetch(\`\${API_URL}/api/master-data?type=STATUS_PROJECT\`);
            if (resStatus.ok) {
                const data = await resStatus.json();
                setStatusList(data.filter(d => d.is_active));
            }
            const resClient = await fetch(\`\${API_URL}/api/master-data?type=KLIEN\`);
            if (resClient.ok) {
                const data = await resClient.json();
                // We don't have clientList state, it seems the project only uses pic and status, but let's check
            }
        } catch (e) { console.error(e); }
    };

    const fetchProjects = async () => {
        try {
            const response = await fetch(\`\${API_URL}/api/projects\`);
            setProjects(await response.json());`);

fs.writeFileSync('d:/PROJECT APS PM/aplikasi-pm/src/App.jsx', content);
console.log('Fixed App.jsx');
