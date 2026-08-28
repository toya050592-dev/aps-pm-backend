const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// Ensure uploads directory exists
if (!serverCode.includes('fs.mkdirSync(path.join(__dirname, \'uploads\')')) {
    serverCode = serverCode.replace(
        "// Serve static uploads",
        "// Ensure uploads directory exists\nconst uploadsDir = path.join(__dirname, 'uploads');\nif (!fs.existsSync(uploadsDir)) {\n    fs.mkdirSync(uploadsDir, { recursive: true });\n}\n\n// Serve static uploads"
    );
}

// Add Global Error Handler
if (!serverCode.includes('Global Error Handler')) {
    serverCode = serverCode.replace(
        "// Connect to Redis (Graceful Fallback)",
        "// Global Error Handler\napp.use((err, req, res, next) => {\n  console.error('[Global Error]', err);\n  res.status(500).json({ message: 'Terjadi kesalahan internal pada server.', error: process.env.NODE_ENV === 'development' ? err.message : undefined });\n});\n\n// Connect to Redis (Graceful Fallback)"
    );
}

// Add unhandledRejection and uncaughtException
if (!serverCode.includes('process.on(\\'uncaughtException\\', shutdown)')) {
    serverCode = serverCode.replace(
        "process.on('SIGTERM', shutdown);",
        "process.on('uncaughtException', (err) => {\n    console.error('[FATAL] Uncaught Exception:', err);\n    shutdown();\n});\nprocess.on('unhandledRejection', (reason, promise) => {\n    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);\n    shutdown();\n});\n\nprocess.on('SIGTERM', shutdown);"
    );
}

fs.writeFileSync('server.js', serverCode);
console.log('server.js updated');
