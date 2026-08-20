import { test, expect } from '@playwright/test';

test.describe('Deep Testing Modules (E2E with Data Input)', () => {
    // Shared user credentials
    const adminUser = 'admin';
    const adminPass = 'admin123';

    test.beforeEach(async ({ page }) => {
        // Go to login page
        await page.goto('http://localhost:5173/'); // Adjust to actual port if needed
        
        // Wait for login form to appear
        await page.waitForSelector('input[type="text"]', { state: 'visible' });
        
        // Perform login
        await page.locator('input[type="text"]').fill(adminUser);
        await page.locator('input[type="password"]').fill(adminPass);
        await page.locator('button[type="submit"]').click();

        // Ensure login successful by waiting for dashboard to load
        await page.waitForSelector('h1:has-text("PM Dashboard")' , { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1500); // Wait for animations
    });

    test('1. Dashboard Ringkasan - Verify Content', async ({ page }) => {
        // Navigate to Dashboard Ringkasan
        await page.locator('.sidebar-item').filter({ hasText: 'Dashboard Ringkasan' }).click();
        await page.waitForTimeout(1000);

        // Verify key elements
        await expect(page.locator('h1').filter({ hasText: 'Dashboard Ringkasan' })).toBeVisible();
        await expect(page.locator('text=Total Project').first()).toBeVisible();
        await expect(page.locator('text=Completed')).toBeVisible();
    });

    test('2. Jadwal Onsite - Tambah Jadwal', async ({ page }) => {
        await page.locator('.sidebar-item').filter({ hasText: 'Jadwal Onsite' }).click();
        await page.waitForTimeout(1000);
        
        await expect(page.locator('h1').filter({ hasText: 'Jadwal Onsite Tim' })).toBeVisible();

        // Click Tambah Jadwal
        await page.locator('button').filter({ hasText: 'Tambah Jadwal' }).click();
        await page.waitForSelector('text=Jadwal Penugasan Baru');

        // Fill form
        // 1. Pilih Personel (custom dropdown)
        await page.locator('text=Pilih anggota tim...').click();
        await page.waitForTimeout(500);
        // click the first user in the list (Assuming admin or user is there)
        const firstUser = page.locator('.hover-bg-light').first();
        if (await firstUser.isVisible()) {
            await firstUser.click();
        }
        
        // Close dropdown
        await page.mouse.click(0, 0);

        // 2. Dates
        const today = new Date().toISOString().split('T')[0];
        await page.locator('input[name="start_date"]').fill(today);
        await page.locator('input[name="end_date"]').fill(today);

        // 3. Location
        await page.locator('input[name="location"]').fill('Kantor Pusat (Test Playwright)');

        // Submit
        await page.locator('button[type="submit"]').filter({ hasText: 'Tambah Jadwal' }).click();
        
        // Verify it was added by waiting for the modal to close and checking the text
        await page.waitForTimeout(1000);
        await expect(page.locator('text=Jadwal Penugasan Baru')).toBeHidden();
        await expect(page.locator('text=Kantor Pusat (Test Playwright)').first()).toBeVisible();
        
        // Cleanup (delete it)
        const deleteBtn = page.locator('.timeline-item').filter({ hasText: 'Kantor Pusat (Test Playwright)' }).locator('button[title="Hapus Jadwal"]').first();
        if (await deleteBtn.isVisible()) {
            page.on('dialog', dialog => dialog.accept());
            await deleteBtn.click();
            await page.waitForTimeout(1000);
        }
    });

    test('3. Overtime - Ajukan Lembur', async ({ page }) => {
        await page.locator('.sidebar-item').filter({ hasText: 'Overtime' }).click();
        await page.waitForTimeout(1000);

        await expect(page.locator('h1').filter({ hasText: 'Overtime (Lembur)' })).toBeVisible();

        // Click Ajukan Lembur
        await page.locator('button').filter({ hasText: 'Ajukan Lembur' }).click();
        await page.waitForTimeout(500);

        // Fill form
        // We select the 2nd option for user if 1st is empty
        const userSelect = page.locator('select').first(); 
        // We can just set value by index or text. Let's just fill the inputs that have names or specific types
        await page.locator('select').nth(2).selectOption({ index: 1 }); // select first user
        
        const today = new Date().toISOString().split('T')[0];
        await page.locator('input[type="date"]').fill(today);
        
        const timeInputs = page.locator('input[type="time"]');
        await timeInputs.nth(0).fill('17:00');
        await timeInputs.nth(1).fill('19:00');
        
        await page.locator('textarea').fill('Testing Lembur via Playwright E2E');
        
        // Submit
        await page.locator('button[type="submit"]').filter({ hasText: 'Kirim Pengajuan' }).click();
        
        await page.waitForTimeout(1000);
        await expect(page.locator('text=Pengajuan lembur berhasil dikirim!')).toBeVisible();
        
        // Clean up
        const deleteBtn = page.locator('tr').filter({ hasText: 'Testing Lembur via Playwright E2E' }).locator('button[title="Hapus"]').first();
        if (await deleteBtn.isVisible()) {
            page.on('dialog', dialog => dialog.accept());
            await deleteBtn.click();
            await page.waitForTimeout(1000);
        }
    });

    test('4. Project & WBS - Tambah Project dan Task', async ({ page }) => {
        await page.locator('.sidebar-item').filter({ hasText: 'Project & WBS' }).click();
        await page.waitForTimeout(1000);

        await expect(page.locator('h1').filter({ hasText: 'Project & Timeline' })).toBeVisible();

        const testProjectName = 'Project E2E ' + Date.now();
        
        // Fill Tambah Project Baru
        await page.locator('input[placeholder*="Nama Project"]').fill(testProjectName);
        
        // PIC Project
        // PIC Project
        const picOptions = await page.locator('select').nth(0).locator('option').count();
        if (picOptions > 1) {
            await page.locator('select').nth(0).selectOption({ index: 1 });
        }
        
        // Jenis Produk
        const productOptions = await page.locator('select').nth(1).locator('option').count();
        if (productOptions > 1) {
            await page.locator('select').nth(1).selectOption({ index: 1 });
        }
        await page.locator('input[placeholder*="Nilai Project"]').fill('150000000');
        
        // Simpan
        await page.locator('button[type="submit"]').filter({ hasText: 'Simpan Project' }).click();
        await page.waitForTimeout(1500);

        // Verify project created
        await expect(page.locator(`text=${testProjectName}`).first()).toBeVisible();

        // Click Detail WBS for the newly created project
        const projectRow = page.locator('tr').filter({ hasText: testProjectName });
        await projectRow.locator('button').filter({ hasText: 'Detail WBS' }).click();
        await page.waitForTimeout(1000);

        // Inside Detail WBS
        await expect(page.locator('h2').filter({ hasText: testProjectName })).toBeVisible();

        // Tambah Task Baru
        const addTaskBtn = page.locator('button').filter({ hasText: 'Tambah Task' }).first();
        if (await addTaskBtn.isVisible()) {
            await addTaskBtn.click();
            await page.waitForTimeout(500);
            
            // Assume there's a modal
            await page.locator('input[name="task_name"], input[placeholder*="Nama Task"]').fill('Desain UI/UX E2E');
            await page.locator('button[type="submit"]').filter({ hasText: 'Simpan' }).click();
            await page.waitForTimeout(1000);
            await expect(page.locator('text=Desain UI/UX E2E').first()).toBeVisible();
        }

        // Back to Projects Page
        await page.locator('button').filter({ hasText: 'Kembali' }).click();
        await page.waitForTimeout(1000);

        // Clean up (delete project)
        const deleteProjectBtn = page.locator('tr').filter({ hasText: testProjectName }).locator('button[title="Hapus Project"]');
        if (await deleteProjectBtn.isVisible()) {
            page.on('dialog', dialog => dialog.accept());
            await deleteProjectBtn.click();
            await page.waitForTimeout(1000);
        }
    });
});
