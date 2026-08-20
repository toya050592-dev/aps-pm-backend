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
                    if (call.name === 'default_api:write_to_file') {
                        let args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
                        if (args.TargetFile && args.TargetFile.includes('ProjectDetail.jsx')) {
                            console.log("FOUND WRITE_TO_FILE for ProjectDetail.jsx!");
                            fs.writeFileSync('restored_ProjectDetail.jsx', args.CodeContent);
                        }
                    }
                }
            }
        } catch(e){}
    }
}
extract();
