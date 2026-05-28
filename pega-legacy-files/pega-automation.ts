// Pega.com Playwright Automation Script (TypeScript Version)
// Install dependencies: npm install playwright @types/playwright

import { chromium } from 'playwright';

async function pegaAutomation() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to https://www.pega.com/...');
    await page.goto('https://www.pega.com/', { waitUntil: 'networkidle' });
    
    // Wait for page to load completely
    await page.waitForLoadState('domcontentloaded');
    
    console.log('⏳ Page loaded. Looking for Solutions link...');
    
    // Method 1: Try direct text match
    try {
      console.log('📍 Attempting Method 1: Text-based selector');
      await page.click('a:has-text("Solutions")', { timeout: 5000 });
      console.log('✅ Successfully clicked Solutions link');
    } catch (e) {
      console.log('❌ Method 1 failed, trying alternative selectors...');
      
      // Method 2: Try navigation menu
      try {
        console.log('📍 Attempting Method 2: Navigation menu');
        const navLink = await page.locator('nav').locator('text=Solutions');
        if (await navLink.isVisible()) {
          await navLink.click();
          console.log('✅ Successfully clicked Solutions from navigation');
        }
      } catch (e2) {
        // Method 3: Log all available links
        console.log('❌ Method 2 failed. Available page links:');
        const allLinks = await page.locator('a').allTextContents();
        allLinks.forEach((link, index) => {
          console.log(`  ${index}: ${link}`);
        });
      }
    }
    
    // Wait for any navigation
    await page.waitForLoadState('networkidle');
    
    console.log('📌 Current URL:', page.url());
    
    // Take screenshot
    await page.screenshot({ 
      path: 'pega-solutions.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved as pega-solutions.png');
    
    // Get page title
    const title = await page.title();
    console.log('📄 Page Title:', title);
    
    // Keep browser open to visualize
    console.log('⏱️  Keeping browser open for 15 seconds...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Error occurred:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('✅ Browser closed');
  }
}

// Run the automation
pegaAutomation().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
