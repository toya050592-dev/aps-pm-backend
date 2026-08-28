const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
const scalarCode = `
// SCALAR API DOCUMENTATION
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
c = c.replace('app.use(checkAnomaly);', 'app.use(checkAnomaly);\n' + scalarCode);
fs.writeFileSync('server.js', c);
