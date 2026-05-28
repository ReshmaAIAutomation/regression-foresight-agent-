// Advanced Pega.com Playwright Script with Login Support
// Handles login if required and navigates to Solutions

import { chromium, Page } from 'playwright';

interface PegaAutomationConfig {
  headless?: boolean;
  username?: string;
  password?: string;
  screenshotPath?: string;
  timeout?: number;
}

async function handleLogin(page: Page, username: string, password: string): Promise<boolean> {
  try {
    console.log('🔐 Attempting to login...');
    
    // Look for login form
    const loginButtons = [
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'a:has-text("Login")',
      'a:has-text("Sign In")',
    ];
    
    for (const selector of loginButtons) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          console.log(`Found login button: ${selector}`);
          await element.click();
          await page.waitForLoadState('networkidle');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Try to fill username
    const usernameFields = ['input[name*="user"]', 'input[type="email"]', 'input[placeholder*="user"]'];
    for (const selector of usernameFields) {
      try {
        const field = await page.locator(selector).first();
        if (await field.isVisible({ timeout: 2000 })) {
          await field.fill(username);
          console.log('✅ Username entered');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Try to fill password
    const passwordFields = ['input[type="password"]', 'input[name*="pass"]'];
    for (const selector of passwordFields) {
      try {
        const field = await page.locator(selector).first();
        if (await field.isVisible({ timeout: 2000 })) {
          await field.fill(password);
          console.log('✅ Password entered');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Click submit
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Login completed');
    return true;
    
  } catch (error) {
    console.log('⚠️  Login might not be required or not available');
    return false;
  }
}

async function pegaAutomationAdvanced(config: PegaAutomationConfig = {}) {
  const {
    headless = false,
    username,
    password,
    screenshotPath = 'pega-solutions.png',
    timeout = 15000
  } = config;
  
  const browser = await chromium.launch({ headless });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to https://www.pega.com/');
    await page.goto('https://www.pega.com/', { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    
    // Handle login if credentials provided
    if (username && password) {
      await handleLogin(page, username, password);
    }
    
    console.log('🔍 Looking for Solutions link...');
    
    // Click Solutions with retry logic
    const maxRetries = 3;
    let clicked = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📌 Attempt ${attempt}/${maxRetries}`);
        
        // Try clicking Solutions
        const solutionLink = page.locator('a, button').filter({ 
          hasText: /^Solutions$/i 
        }).first();
        
        if (await solutionLink.isVisible({ timeout: 5000 })) {
          await solutionLink.click({ timeout: 5000 });
          clicked = true;
          console.log('✅ Solutions link clicked successfully');
          break;
        }
      } catch (e) {
        console.log(`⚠️  Attempt ${attempt} failed: ${(e as Error).message}`);
      }
      
      // Wait before retry
      if (!clicked && attempt < maxRetries) {
        await page.waitForTimeout(2000);
      }
    }
    
    if (!clicked) {
      console.log('⚠️  Could not click Solutions link. Logging available links:');
      const allMenuItems = await page.locator('a, button').allTextContents();
      console.log('Menu items:', allMenuItems.filter((text: string) => text.trim().length > 0));
    }
    
    // Wait for final page load
    await page.waitForLoadState('networkidle');
    
    console.log('📌 Final URL:', page.url());
    console.log('📄 Page Title:', await page.title());
    
    // Take full page screenshot
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // Extract some data from Solutions page if available
    const headings = await page.locator('h1, h2').allTextContents();
    if (headings.length > 0) {
      console.log('📝 Page Headings:', headings.slice(0, 5));
    }
    
    console.log(`⏱️  Keeping browser open for ${timeout / 1000} seconds...`);
    await page.waitForTimeout(timeout);
    
  } catch (error) {
    console.error('❌ Critical error:', error);
    // Take error screenshot
    await page.screenshot({ path: 'pega-error.png' });
    throw error;
  } finally {
    await browser.close();
    console.log('✅ Automation completed');
  }
}

// Export for use as module
export { pegaAutomationAdvanced, PegaAutomationConfig };

// Run if executed directly
if (require.main === module) {
  pegaAutomationAdvanced({
    headless: false,
    timeout: 15000
    // Uncomment to add login:
    // username: 'your-email@example.com',
    // password: 'your-password'
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}
