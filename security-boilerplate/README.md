# Node.js Enterprise Security Boilerplate

Boilerplate ini mengekstrak semua fitur keamanan tingkat lanjut (Enterprise-Grade Security) yang digunakan di backend APS PM. Anda dapat menempelkannya (plug-and-play) di proyek Express.js/Node.js apa pun.

## ??? Fitur Keamanan yang Tersedia
1. **RS256 JWT Auto-Rotation**: Kunci publik/privat yang di-rotasi otomatis tiap 30 hari.
2. **AES-256-GCM DB Encryption**: Fungsi utilitas untuk mengenkripsi kolom sensitif (PII).
3. **Automated Session Revocation & Honeypot**: IP akan langsung ter-blacklist 24 jam dan sesi user dicabut jika melakukan 5 percobaan anomali dalam 10 detik atau menyentuh rute palsu.
4. **DR Circuit Breaker**: Token tetap sah meskipun database terputus total (Disaster Recovery).
5. **OWASP Standard**: Rate limiter dinamis, Helmet CSP/HSTS, dan XSS payload sanitizer.

## ?? Panduan Integrasi (Tahapan Pemasangan)

### Tahap 1: Instalasi Dependensi
Pastikan proyek Node.js baru Anda menginstal modul berikut:
```bash
npm install express jsonwebtoken helmet xss express-rate-limit
```
*(Catatan: Modul `crypto` sudah bawaan dari Node.js, tidak perlu diinstal).*

### Tahap 2: Copy File Boilerplate
Salin folder `security-boilerplate` (beserta file `index.js` di dalamnya) ke dalam struktur proyek baru Anda.

### Tahap 3: Persiapan Database
Boilerplate ini menggunakan tabel `jwt_keys` dan membaca tabel `users`.
Pastikan database di proyek Anda memiliki kolom `session_token` di tabel `users`. 

### Tahap 4: Inisialisasi di `server.js` Anda
Buka file utama server Anda (`server.js` / `app.js`), lalu inisialisasi Security Framework ini *sebelum* mendefinisikan rute bisnis apa pun:

```javascript
const express = require('express');
const app = express();
const pool = require('./config/database'); // Sesuaikan dengan koneksi DB proyek Anda
const initializeSecurityFramework = require('./security-boilerplate');

app.use(express.json());

// 1. Inisiasi Kerangka Keamanan
const security = initializeSecurityFramework(app, pool, process.env);

// 2. Refresh Key RS256 pertama kali
security.refreshJwtKeys().then(() => {
    console.log("Kunci Kriptografi RS256 Siap!");
});

// 3. Pasang middleware Auth & Limiter di rute Anda
app.use('/api', security.authenticateToken);
app.get('/api/reports', security.limiters.heavyLimiter, (req, res) => {
    // Logika bisnis... (req.isEmergencyMode tersedia jika DB mati)
    if (req.isEmergencyMode) return res.status(503).json({ error: "Sistem Degraded" });
    res.json({ data: "Aman" });
});

// 4. Contoh penggunaan pembuatan Token & Enkripsi
app.post('/api/login', security.limiters.loginLimiter, async (req, res) => {
    // ... Cek user di database ...
    
    // Enkripsi data sensitif 
    const nikEnkripsi = security.encryptAES("1234567890");

    // Buat JWT dengan RS256 Active Key
    const safeUser = { id: 1, username: 'budi', session_token: 'uuid-123' };
    const token = security.generateAuthToken(safeUser);
    
    // Catat ke Audit Trail
    security.auditLog('LOGIN_SUCCESS', 1, req, { username: 'budi' });
    
    res.json({ token });
});
```
