const fs = require('fs');
const readline = require('readline');

async function extract() {
    const fileStream = fs.createReadStream('C:\\Users\\haryanto\\.gemini\\antigravity\\brain\\a5870cbc-2367-47e9-b9f9-133bda04d95b\\.system_generated\\logs\\transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            if (step.tool_calls) {
                for (const call of step.tool_calls) {
                    if (call.name === 'default_api:view_file' && call.response && call.response.output) {
                        if (call.response.output.includes('export default ProjectDetail')) {
                            console.log("FOUND PROJECT DETAIL IN VIEW FILE!");
                            fs.writeFileSync('restored_ProjectDetail.jsx', call.response.output);
                        }
                    }
                }
            }
        } catch(e){}
    }
}
extract();
