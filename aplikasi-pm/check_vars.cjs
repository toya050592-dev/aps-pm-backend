const babel = require('@babel/core');
const fs = require('fs');

function checkFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const ast = babel.parseSync(code, {
        filename: filePath,
        presets: ['@babel/preset-react']
    });

    const undeclared = new Set();
    babel.traverse(ast, {
        Identifier(path) {
            // If the identifier is a reference to a variable
            if (path.isReferencedIdentifier()) {
                const name = path.node.name;
                // Check if it's not bound in the scope and not a global
                if (!path.scope.hasBinding(name) && !['console', 'setTimeout', 'Math', 'Date', 'window', 'document', 'fetch', 'Object', 'Error', 'Promise', 'URL', 'Blob', 'URLSearchParams', 'undefined', 'isNaN', 'parseFloat'].includes(name)) {
                    undeclared.add(name);
                }
            }
        }
    });

    console.log(`Undeclared in ${filePath}:`, [...undeclared]);
}

checkFile('d:/PROJECT APS PM/aplikasi-pm/src/pages/ProjectDetail.jsx');
checkFile('d:/PROJECT APS PM/aplikasi-pm/src/components/GanttChart.jsx');
checkFile('d:/PROJECT APS PM/aplikasi-pm/src/App.jsx');
