@echo off
echo Menyalakan Backend...
start cmd /k "cd /d D:\PROJECT APS PM && npx nodemon server.js"

timeout /t 3 /nobreak >nul

echo Menyalakan Frontend...
start cmd /k "cd /d D:\PROJECT APS PM\aplikasi-pm && npm run dev"

echo Kedua server sedang menyala. Buka browser ke http://localhost:5173