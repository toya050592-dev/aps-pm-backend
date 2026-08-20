const fs = require('fs');
const readline = require('readline');

async function recover() {
    const fileStream = fs.createReadStream('C:\Users\haryanto\.gemini\antigravity\brain\a5870cbc-2367-47e9-b9f9-133bda04d95b\.system_generated\logs\transcript_full.jsonl');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let latestContent = '';
    for await (const line of rl) {
        try {
            const step = JSON.parse(line);
            if (step.tool_calls) {
                for (const call of step.tool_calls) {
                    if (call.name === 'default_api:view_file' && call.response && call.response.output) {
                        // Sometimes view_file shows the content
                    }
                }
            }
        } catch(e){}
    }
}
recover();
