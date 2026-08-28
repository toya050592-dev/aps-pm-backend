const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

const scalarCode = `// SCALAR API DOCUMENTATION
const { apiReference } = require('@scalar/express-api-reference');
const openapiDocument = require('./openapi.json');
app.use(
  '/reference',
  apiReference({
    spec: {
      content: openapiDocument,
    },
    theme: 'purple',
    layout: 'modern'
  })
);

`;

c = c.replace(scalarCode, '');
c = c.replace('// HTTP SECURITY HEADERS (OWASP)', scalarCode + '// HTTP SECURITY HEADERS (OWASP)');

fs.writeFileSync('server.js', c);
