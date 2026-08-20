import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('Test Fitur Ekspor Laporan WBS', async ({ page }) => {
  // 1. Buka halaman utama
  await page.goto('/');

  // 2. Proses Login
  await expect(page.locator('h2').filter({ hasText: 'Project Management Dashboard' })).toBeVisible();
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Masuk")');

  // 3. Pastikan sudah masuk ke Dashboard Ringkasan
  await expect(page.locator('h1').filter({ hasText: 'Dashboard Ringkasan' })).toBeVisible({ timeout: 15000 });

  // 4. Navigasi ke Modul "Project & WBS"
  await page.click('text=Project & WBS');
  await expect(page.locator('h1').filter({ hasText: 'Project & Timeline' })).toBeVisible();

  // 5. Buat project baru jika tabel kosong, untuk memastikan tombol Detail WBS ada
  await page.fill('input[placeholder*="Nama Project"]', 'Project Test Export WBS');
  await page.fill('input[placeholder*="Nilai Project"]', '50000000');
  await page.click('button:has-text("Simpan Project")');

  // Beri waktu agar tabel ter-refresh
  await page.waitForTimeout(2000);

  // 6. Masuk ke Detail Project (WBS) untuk project yang baru dibuat / project pertama
  const detailButton = page.locator('button', { hasText: 'Detail WBS' }).first();
  await expect(detailButton).toBeVisible();
  await detailButton.click();

  // 6. Pastikan sudah berada di halaman Detail Project / WBS
  // Terdapat tombol "Ekspor Excel"
  const exportButton = page.locator('button', { hasText: 'Ekspor Excel' });
  await expect(exportButton).toBeVisible();

  // 7. Mulai proses ekspor dan tangkap (intercept) event download
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    exportButton.click()
  ]);

  // 8. Verifikasi bahwa file berhasil diunduh
  const downloadError = await download.failure();
  expect(downloadError).toBeNull(); // Pastikan tidak ada error saat download

  const suggestedFilename = download.suggestedFilename();
  expect(suggestedFilename).toContain('Laporan_WBS');
  expect(suggestedFilename).toContain('.xlsx');

  // Simpan file ke direktori sementara untuk verifikasi ukuran
  const tempDownloadPath = path.join(process.cwd(), 'downloads', suggestedFilename);
  await download.saveAs(tempDownloadPath);

  // Verifikasi file ada dan ukurannya lebih dari 0 bytes
  expect(fs.existsSync(tempDownloadPath)).toBeTruthy();
  const stats = fs.statSync(tempDownloadPath);
  expect(stats.size).toBeGreaterThan(0);

  // Tunggu sejenak agar video merekam proses ini
  await page.waitForTimeout(3000);
});
