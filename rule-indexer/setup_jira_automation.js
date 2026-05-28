const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function automateJiraSetup() {
    console.log('\n=============================================================');
    console.log(' 🚀  AIELEVATE: JIRA CLOUD AUTOMATED CREDENTIALS SETUP  🚀');
    console.log('=============================================================');
    console.log('[Playwright] Starting headed Chromium browser...');

    // Launch headed browser with slight slowing delay so it is visible and comfortable
    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 800 
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    console.log('\n[Jira Setup] Navigating to Atlassian Login Portal...');
    await page.goto('https://id.atlassian.com/login');

    console.log('\n=============================================================');
    console.log(' ⚠️  HUMAN-IN-THE-LOOP ACTION REQUIRED:');
    console.log(' Please interact with the open browser window to LOG IN');
    console.log(' or SIGN UP for your free Atlassian/Jira account.');
    console.log('=============================================================');
    
    // Wait for user to authenticate and navigate to profile/security dashboard
    // We poll the URL until the user is logged in
    let loggedIn = false;
    while (!loggedIn) {
        const currentUrl = page.url();
        if (currentUrl.includes('id.atlassian.com/manage-profile') || 
            currentUrl.includes('start.atlassian.com') ||
            currentUrl.includes('.atlassian.net')) {
            loggedIn = true;
            break;
        }
        await page.waitForTimeout(2000); // Poll every 2 seconds
    }

    console.log('\n[Success] Atlassian Authentication Detected!');
    console.log('[Playwright] Navigating to API Token Management console...');
    await page.goto('https://id.atlassian.com/manage-profile/security/api-tokens');

    // Wait for the token page elements to load
    await page.waitForSelector('button:has-text("Create API token"), button:has-text("Create token")');

    console.log('[Playwright] Creating new JIRA API Token...');
    
    // Click "Create API token" button
    const createButton = page.locator('button:has-text("Create API token"), button:has-text("Create token")').first();
    await createButton.click();

    // Wait for the modal label input field to appear
    await page.waitForSelector('input[type="text"], input[placeholder="Enter a label"]');
    
    // Fill in the token label
    const labelInput = page.locator('input[type="text"], input[placeholder="Enter a label"]').first();
    await labelInput.fill('RegressionForesightAgent');

    // Click submit/create button in modal
    const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').first();
    await submitButton.click();

    console.log('[Playwright] Extracting token value from Atlassian modal...');
    
    // Wait for the generated token to appear in the read-only box
    await page.waitForSelector('input[readonly], div:has-text("Your new API token")');
    
    // Extract the token text
    let tokenValue = '';
    const tokenField = page.locator('input[readonly]').first();
    if (await tokenField.count() > 0) {
        tokenValue = await tokenField.inputValue();
    } else {
        // Fallback search
        tokenValue = await page.locator('code, pre').first().innerText();
    }

    if (!tokenValue) {
        console.error('[Error] Could not automatically extract the token. Please copy it manually from the browser screen.');
        await browser.close();
        rl.close();
        return;
    }

    console.log('\n=============================================================');
    console.log(' 🎉 JIRA API TOKEN EXTRACTED SUCCESSFULLY!');
    console.log('=============================================================');

    // Parse and save directly to local .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Filter out any old JIRA_API_TOKEN definitions
    const envLines = envContent.split('\n').filter(line => !line.startsWith('JIRA_API_TOKEN='));
    envLines.push(`JIRA_API_TOKEN=${tokenValue}`);
    
    // Check if JIRA_EMAIL is already defined, if not ask or add a placeholder
    const hasEmail = envLines.some(line => line.startsWith('JIRA_EMAIL='));
    if (!hasEmail) {
        envLines.push('JIRA_EMAIL=your_atlassian_email_here');
    }
    
    const hasDomain = envLines.some(line => line.startsWith('JIRA_DOMAIN='));
    if (!hasDomain) {
        envLines.push('JIRA_DOMAIN=https://your_subdomain.atlassian.net');
    }

    fs.writeFileSync(envPath, envLines.join('\n'), 'utf-8');
    console.log(`[File System] Saved JIRA_API_TOKEN securely inside your local .env file:`);
    console.log(`   --> ${envPath}`);

    console.log('\n[Playwright] Closing automated headed browser...');
    await browser.close();
    
    console.log('\n=============================================================');
    console.log(' 🏁  SETUP COMPLETED!');
    console.log(' 1. Your Jira API Token is saved in your local .env file.');
    console.log(' 2. Next, open your .env file and fill in your actual:');
    console.log('    - JIRA_EMAIL (Your Atlassian login email)');
    console.log('    - JIRA_DOMAIN (Your Jira URL, e.g., https://yourname.atlassian.net)');
    console.log('=============================================================\n');
    rl.close();
}

automateJiraSetup().catch(err => {
    console.error('[Automation Error]', err);
    rl.close();
});
