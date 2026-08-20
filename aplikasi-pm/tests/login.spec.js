import { test, expect } from '@playwright/test';

test('Test Login and Record Video', async ({ page }) => {
  // Buka halaman aplikasi
  await page.goto('/');

  // Pastikan judul login muncul
  await expect(page.locator('h2').filter({ hasText: 'Project Management Dashboard' })).toBeVisible();

  // Isi username
  // Karena input tidak punya id, kita pilih input text pertama
  await page.fill('input[type="text"]', 'admin');
  
  // Isi password
  await page.fill('input[type="password"]', 'admin123');

  // Klik tombol login
  await page.click('button:has-text("Masuk")');

  // Tunggu sampai masuk ke halaman dashboard 
  await expect(page.locator('h1').filter({ hasText: 'Dashboard Ringkasan' })).toBeVisible({ timeout: 15000 });

  // Beri sedikit jeda 3 detik agar video bisa merekam isi dashboard sejenak
  await page.waitForTimeout(3000);
});
