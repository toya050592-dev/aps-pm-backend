import { test, expect } from '@playwright/test';

test('Pengujian Seluruh Modul Aplikasi (End-to-End)', async ({ page }) => {
  // Set timeout lebih lama karena banyak modul yang diuji
  test.setTimeout(60000); 

  // ================= 1. LOGIN =================
  await page.goto('/');
  await expect(page.locator('h2').filter({ hasText: 'Project Management Dashboard' })).toBeVisible();
  
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Masuk")');

  // ================= 2. DASHBOARD RINGKASAN =================
  // Menunggu masuk ke halaman Dashboard Ringkasan
  await expect(page.locator('text=Dashboard Ringkasan').first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000); // Beri jeda untuk direkam video

  // ================= 3. JADWAL ONSITE =================
  // Klik menu Jadwal Onsite di sidebar
  await page.click('div.sidebar-item:has-text("Jadwal Onsite")');
  await expect(page.locator('h1').filter({ hasText: 'Jadwal Onsite Tim' })).toBeVisible();
  await page.waitForTimeout(2000);

  // ================= 4. PUSAT LAPORAN =================
  await page.click('div.sidebar-item:has-text("Pusat Laporan")');
  await expect(page.locator('h1').filter({ hasText: 'Pusat Laporan' })).toBeVisible();
  await page.waitForTimeout(2000);

  // ================= 5. OVERTIME (LEMBUR) =================
  await page.click('text=Overtime (Lembur)');
  await expect(page.locator('h1').filter({ hasText: 'Overtime (Lembur)' })).toBeVisible();
  await page.waitForTimeout(2000);

  // ================= 6. PROJECT & WBS =================
  await page.click('div.sidebar-item:has-text("Project & WBS")');
  await expect(page.locator('h1').filter({ hasText: 'Project & Timeline' })).toBeVisible();
  await page.waitForTimeout(2000);

  // ================= 7. MASTER DATA =================
  await page.click('div.sidebar-item:has-text("Master Data")');
  await expect(page.locator('h1').filter({ hasText: 'Modul Master Data' })).toBeVisible();
  await page.waitForTimeout(2000);

  // ================= 8. LOGOUT =================
  await page.click('text=Logout');
  
  // Memastikan kembali ke halaman Login
  await expect(page.locator('h2').filter({ hasText: 'Project Management Dashboard' })).toBeVisible();
  await page.waitForTimeout(2000);
});
