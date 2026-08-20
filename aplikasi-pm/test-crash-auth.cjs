const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Set localStorage before navigating
  await context.addInitScript(() => {
    localStorage.setItem('pm_user', JSON.stringify({
      id: 1,
      role: 'Admin',
      full_name: 'Test Admin',
      permissions: ['summary', 'dashboard', 'master_data', 'reports']
    }));
  });

  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`BROWSER ERROR: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    console.log(`PAGE ERROR: ${err.message}`);
  });

  try {
    console.log("Navigating to http://localhost:5173...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log("Navigation complete.");
    
    await page.waitForTimeout(2000);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log("Body text preview:", bodyText.substring(0, 100));
  } catch (err) {
    console.error("Script error:", err);
  } finally {
    await browser.close();
  }
})();
