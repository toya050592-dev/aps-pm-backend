npm install -g pm2
pm2 start server.js --name "aplikasi-pm"
pm2 save
echo "Backend berhasil dijalankan dengan PM2!"
pause
