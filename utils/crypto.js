const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// --- APPLICATION-LEVEL CRYPTOGRAPHY (AES-256-GCM) ---
if (!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_SALT) {
  console.error("CRITICAL ERROR: ENCRYPTION_KEY and ENCRYPTION_SALT must be explicitly set in .env.");
  process.exit(1);
}
const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT;
const ENCRYPTION_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY, ENCRYPTION_SALT, 32);
const IV_LENGTH = 16;

const encryptAES = (text) => {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + authTag + ':' + encrypted;
  } catch (err) { 
    console.error("[AES ENCRYPTION ERROR] Failed to encrypt data:", err.message);
    throw new Error("Encryption failed for sensitive data");
  }
};

const decryptAES = (text) => {
  if (!text || typeof text !== 'string' || !text.includes(':')) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn("[SECURITY WARNING] AES Decryption failed. Returning null to prevent data leak. Error:", err.message);
    return null;
  }
};

const dummyBcryptCompare = async (password) => {
    await bcrypt.compare(password, '$2a$12$C6UzMDM.H6dfI/f/IKcEeO1V.eZlG3Gk/U/6k.v/s/4G/s/7C/7i');
};

module.exports = { encryptAES, decryptAES, dummyBcryptCompare };
