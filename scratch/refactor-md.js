const fs = require('fs');
let c = fs.readFileSync('aplikasi-pm/src/App.jsx', 'utf8');

const oldBlock = `    const fetchMasterData = async () => {
        try {
            const res = await fetch(\`\${API_URL}/api/master-data?type=JENIS_PRODUK\`);
            if (res.ok) {
                const data = await res.json();
                setProductTypes(data.filter(d => d.is_active));
            }

            const resStatus = await fetch(\`\${API_URL}/api/master-data?type=STATUS_Project\`);
            if (resStatus.ok) {
                const dataStatus = await resStatus.json();
                setProjectStatuses(dataStatus.filter(d => d.is_active));
            }

            const resMarketing = await fetch(\`\${API_URL}/api/master-data?type=MARKETING\`);
            if (resMarketing.ok) {
                const dataMarketing = await resMarketing.json();
                setMarketings(dataMarketing.filter(d => d.is_active));
            }
        } catch (err) { console.error(err); }
    };`;

const newBlock = `    const fetchMasterData = async () => {
        try {
            const dataProduk = await masterDataService.getByType('JENIS_PRODUK');
            setProductTypes(dataProduk.filter(d => d.is_active));

            const dataStatus = await masterDataService.getByType('STATUS_Project');
            setProjectStatuses(dataStatus.filter(d => d.is_active));

            const dataMarketing = await masterDataService.getByType('MARKETING');
            setMarketings(dataMarketing.filter(d => d.is_active));
        } catch (err) { console.error(err); }
    };`;

c = c.replace(oldBlock, newBlock);
fs.writeFileSync('aplikasi-pm/src/App.jsx', c);
