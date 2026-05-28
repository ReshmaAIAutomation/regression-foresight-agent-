// Pega.com Playwright Automation Script
// Install dependencies: npm install playwright

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to https://www.pega.com/...');
    await page.goto('https://www.pega.com/', { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    console.log('Page loaded. Looking for Solutions link...');
    
    // Try multiple selectors for the Solutions link
    const solutionSelectors = [
      'a:has-text("Solutions")',
      'button:has-text("Solutions")',
      '[href*="solutions"]',
      'nav a:has-text("Solutions")',
      'text=Solutions'
    ];
    
    let solutionFound = false;
    for (const selector of solutionSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`Found Solutions element with selector: ${selector}`);
          await element.click();
          solutionFound = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!solutionFound) {
      console.log('Solutions link not found with common selectors. Page elements:');
      const allLinks = await page.locator('a').allTextContents();
      console.log('Available links:', allLinks);
    }
    
    // Wait for navigation if click was successful
    if (solutionFound) {
      await page.waitForLoadState('networkidle');
      console.log('Successfully navigated to Solutions page');
      console.log('Current URL:', page.url());
    }
    
    // Take screenshot
    await page.screenshot({ path: 'pega-solutions.png' });
    console.log('Screenshot saved as pega-solutions.png');
    
    // Keep browser open for 10 seconds to see the result
    console.log('Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    await browser.close();
  }
})();
