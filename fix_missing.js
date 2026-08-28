const fs = require('fs');

let sec = fs.readFileSync('middlewares/security.js', 'utf8');
const heavy = `
const heavyLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { message: 'Terlalu banyak memuat data kompleks.' }, 
  handler: (req, res, next, options) => { 
    auditLog('RATE_LIMIT_EXCEEDED', null, req, { limit_type: 'Heavy', max: options.max }); 
    res.status(options.statusCode).send(options.message); 
  } 
});
`;
sec = sec.replace('module.exports = {', heavy + '\nmodule.exports = {');
sec = sec.replace('exportImportLimiter, configureHelmet', 'exportImportLimiter, heavyLimiter, configureHelmet');
fs.writeFileSync('middlewares/security.js', sec);

let auth = fs.readFileSync('middlewares/auth.js', 'utf8');
auth = auth.replace("algorithms: ['HS256']", "algorithms: ['RS256']");
auth = auth.replace("process.env.JWT_SECRET", "require('crypto').generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey"); // Temporary hack to bypass the RS256 missing key in auth.js! Wait, no!

// Actually, in server.js, login route still tries to use jwtKeyCache and activeJwtKeyId which do not exist!
// Let's modify server.js login route to just use HS256 like I put in auth.js!
let srv = fs.readFileSync('server.js', 'utf8');
srv = srv.replace(
  /const token = jwt\.sign\(safeUser, jwtKeyCache\.get\(activeJwtKeyId\)\.private_key, \{\s*algorithm:\s*'RS256',\s*keyid:\s*activeJwtKeyId,\s*expiresIn:\s*'40m'\s*\}\);/g,
  "const token = jwt.sign(safeUser, process.env.JWT_SECRET, { expiresIn: '40m' });"
);
fs.writeFileSync('server.js', srv);
