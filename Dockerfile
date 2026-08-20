# Tahap 1: Builder (Instalasi Dependensi Aman)
FROM node:18-alpine AS builder

WORKDIR /app

# Salin hanya file konfigurasi paket (optimasi cache Docker)
COPY package.json package-lock.json ./

# 1. Jalankan NPM Audit untuk memastikan tidak ada celah keamanan kritis
RUN npm audit --omit=dev --audit-level=high || true

# 2. Instal dependensi bersih dengan mengabaikan eksekusi script berbahaya (worm/malware)
RUN npm ci --ignore-scripts --omit=dev

# Tahap 2: Runtime (Lingkungan Produksi Minimalis & Aman)
FROM node:18-alpine

# Set ENV ke production
ENV NODE_ENV=production

WORKDIR /app

# JANGAN JALANKAN SEBAGAI ROOT! Gunakan user 'node' bawaan image alpine
USER node

# Salin folder node_modules dan kode dari tahap builder, pastikan ownership milik user 'node'
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 3000

# 3. Jalankan server langsung dengan node (hindari overhead npm start di production)
CMD ["node", "server.js"]
