const fs = require("fs");
let code = fs.readFileSync("config/jts.js", "utf8");
code = code.replace(
    "async createSession(sessionData) {",
    "async createSession(input) {\n        const sessionData = this.createSessionData(input);"
);
fs.writeFileSync("config/jts.js", code);

