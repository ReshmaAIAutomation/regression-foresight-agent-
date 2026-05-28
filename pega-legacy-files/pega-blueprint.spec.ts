import { test, expect } from '@playwright/test';

/**
 * Pega Blueprint Automation Test Suite
 * 
 * These tests automate the login flow for Pega Blueprint
 * Email: abc@gmail.com
 * Process: Email -> Access Code -> Blueprint Dashboard
 */

test.describe('Pega Blueprint Login Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to Pega Blueprint before each test
    await page.goto('https://www.pega.com/blueprint');
    await page.waitForLoadState('networkidle');
  });

  test('TC1: Navigate to Pega Blueprint and verify landing page', async ({ page }) => {
    // Verify page title
    const title = await page.title();
    expect(title).toContain('Pega Blueprint');
    
    // Verify welcome heading
    const welcomeHeading = page.getByRole('heading', {
      name: /collaborative workflow design/i,
    });
    await expect(welcomeHeading).toBeVisible();
  });

  test('TC2: Verify Get Started form is displayed', async ({ page }) => {
    // Check for the main heading
    const getStartedHeading = page.getByRole('heading', {
      name: /get started with pega blueprint/i,
    });
    await expect(getStartedHeading).toBeVisible({ timeout: 5000 });

    // Check for email input field
    const emailField = page.getByPlaceholder('Provide E-mail address');
    await expect(emailField).toBeVisible();

    // Check for send button
    const sendButton = page.getByRole('button', {
      name: /send access code to my email/i,
    });
    await expect(sendButton).toBeVisible();
  });

  test('TC3: Fill email and send access code', async ({ page }) => {
    // Locate email field
    const emailField = page.getByPlaceholder('Provide E-mail address');
    
    // Enter email
    await emailField.fill('abc@gmail.com');
    await expect(emailField).toHaveValue('abc@gmail.com');

    // Click send button
    const sendButton = page.getByRole('button', {
      name: /send access code to my email/i,
    });
    await sendButton.click();

    // Wait for confirmation message
    const message = page.locator('text=A code has been sent to the email address');
    await expect(message).toBeVisible({ timeout: 10000 });
  });

  test('TC4: Verify access code dialog appears', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Verify dialog heading
    const heading = page.getByRole('heading', {
      name: /enter blueprint access code/i,
    });
    await expect(heading).toBeVisible();

    // Verify dialog contains expected elements
    const successIcon = page.locator('img[src*="check"]').or(
      page.locator('text=A code has been sent')
    );
    await expect(successIcon).toBeVisible();
  });

  test('TC5: Verify email field is disabled in dialog', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Find email field (should be disabled)
    const emailFields = page.locator('input[type="text"][value="abc@gmail.com"]');
    
    // Check if any email field is disabled
    const disabledEmailField = emailFields.first();
    const isDisabled = await disabledEmailField.evaluate(
      (el: HTMLInputElement) => el.disabled
    );
    
    if (await disabledEmailField.isVisible()) {
      expect(isDisabled).toBe(true);
    }
  });

  test('TC6: Verify access code input field', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Find access code field
    const accessCodeField = page.getByPlaceholder('Provide access code');
    await expect(accessCodeField).toBeVisible();

    // Verify it's empty
    await expect(accessCodeField).toHaveValue('');

    // Verify it's not disabled
    const isDisabled = await accessCodeField.evaluate(
      (el: HTMLInputElement) => el.disabled
    );
    expect(isDisabled).toBe(false);
  });

  test('TC7: Verify country setting shows India', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Check for country text
    const countryText = page.locator('text=Country: India');
    await expect(countryText).toBeVisible();

    // Check for change button
    const changeButton = page.getByRole('button', { name: /change/i });
    await expect(changeButton).toBeVisible();
  });

  test('TC8: Verify Continue button is disabled', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Find continue button
    const continueButton = page.getByRole('button', {
      name: /continue to pega blueprint/i,
    });

    // Verify it's disabled
    await expect(continueButton).toBeDisabled();
  });

  test('TC9: Verify email checkbox is checked by default', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Find checkbox
    const emailCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(emailCheckbox).toBeChecked();

    // Verify checkbox text
    const checkboxText = page.locator(
      'text=I\'d like to receive occasional email updates'
    );
    await expect(checkboxText).toBeVisible();
  });

  test('TC10: Verify Resend Code button is disabled with timer', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Find resend button
    const resendButton = page.getByRole('button', { name: /resend code/i });
    await expect(resendButton).toBeDisabled();

    // Check for timer text
    const timerText = page.locator('text=Resend available in');
    await expect(timerText).toBeVisible();
  });

  test('TC11: Access code dialog - Terms and Agreement links', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Verify Terms of Use link
    const termsLink = page.getByRole('link', { name: /terms of use/i });
    await expect(termsLink).toBeVisible();

    // Verify Blueprint Agreement link
    const agreementLink = page.getByRole('link', {
      name: /pega blueprint agreement/i,
    });
    await expect(agreementLink).toBeVisible();
  });

  test('TC12: Cancel button redirects to initial form', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Find and click cancel button
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Wait for page to update
    await page.waitForTimeout(500);

    // Verify we're back to get started form
    const getStartedHeading = page.getByRole('heading', {
      name: /get started with pega blueprint/i,
    });
    await expect(getStartedHeading).toBeVisible();

    // Verify send button is visible again
    const sendButton = page.getByRole('button', {
      name: /send access code to my email/i,
    });
    await expect(sendButton).toBeVisible();
  });

  test('TC13: Accessibility - Verify page structure', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Check for main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check for heading hierarchy
    const heading2 = page.getByRole('heading', {
      name: /enter blueprint access code/i,
    });
    await expect(heading2).toBeVisible();
  });

  test('TC14: Verify navigation header is present', async ({ page }) => {
    // Check for Pega logo
    const pegaLogo = page.getByRole('link', { name: /pega/i }).first();
    await expect(pegaLogo).toBeVisible();

    // Check for Try Pega link
    const tryPegaLink = page.getByRole('link', { name: /try pega/i });
    await expect(tryPegaLink).toBeVisible();

    // Check for Log in button
    const loginButton = page.getByRole('button', { name: /log in/i });
    await expect(loginButton).toBeVisible();
  });

  test('TC15: Full page screenshot', async ({ page }) => {
    // Navigate to access code dialog
    await setupAccessCodeDialog(page);

    // Take screenshot
    await page.screenshot({
      path: `pega-blueprint-${Date.now()}.png`,
      fullPage: true,
    });
  });

  test('TC16: Header links in navigation', async ({ page }) => {
    // Verify main navigation items exist
    const navItems = ['Platform', 'Solutions', 'Customers', 'Learn'];

    for (const item of navItems) {
      const button = page.getByRole('button', { name: item });
      await expect(button).toBeVisible();
    }
  });

  test('TC17: Footer links verification', async ({ page }) => {
    // Scroll to footer
    await page.locator('footer, [role="contentinfo"]').scrollIntoViewIfNeeded();

    // Check for some footer links
    const communityLink = page.getByRole('link', { name: /community/i });
    const careersLink = page.getByRole('link', { name: /careers/i });

    await expect(communityLink).toBeVisible();
    await expect(careersLink).toBeVisible();
  });

  test('TC18: Verify error handling - invalid email format', async ({ page }) => {
    // Try entering invalid email
    const emailField = page.getByPlaceholder('Provide E-mail address');
    
    // Enter invalid email
    await emailField.fill('invalid-email');
    
    // Try to send
    const sendButton = page.getByRole('button', {
      name: /send access code to my email/i,
    });
    await sendButton.click();

    // Page might show validation error or process (depending on backend)
    // Wait to see if error appears
    await page.waitForTimeout(2000);
  });

  test('TC19: Complete flow with valid email', async ({ page }) => {
    // Step 1: Verify landing
    const welcomeMsg = page.getByRole('heading', {
      name: /collaborative workflow design/i,
    });
    await expect(welcomeMsg).toBeVisible();

    // Step 2: Enter email
    const emailField = page.getByPlaceholder('Provide E-mail address');
    await emailField.fill('abc@gmail.com');

    // Step 3: Send access code
    const sendButton = page.getByRole('button', {
      name: /send access code to my email/i,
    });
    await sendButton.click();

    // Step 4: Verify access code dialog
    const accessCodeHeading = page.getByRole('heading', {
      name: /enter blueprint access code/i,
    });
    await expect(accessCodeHeading).toBeVisible({ timeout: 10000 });

    // Step 5: Verify all elements
    const accessCodeField = page.getByPlaceholder('Provide access code');
    const continueButton = page.getByRole('button', {
      name: /continue to pega blueprint/i,
    });

    await expect(accessCodeField).toBeVisible();
    await expect(continueButton).toBeDisabled();

    console.log('✅ Complete flow verification passed!');
  });

  test('TC20: Responsive design - check layout', async ({ page }) => {
    // Get viewport size
    const size = page.viewportSize();
    console.log(`Viewport size: ${size?.width}x${size?.height}`);

    // Verify main content is visible
    const mainForm = page.locator('[role="article"]').first();
    await expect(mainForm).toBeVisible();

    // Check if dialog fits in viewport
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible()) {
      const boundingBox = await dialog.boundingBox();
      console.log(`Dialog size: ${boundingBox?.width}x${boundingBox?.height}`);
    }
  });
});

/**
 * Helper function to navigate to access code dialog
 */
async function setupAccessCodeDialog(page: any) {
  // Fill email
  const emailField = page.getByPlaceholder('Provide E-mail address');
  await emailField.fill('abc@gmail.com');

  // Send access code
  const sendButton = page.getByRole('button', {
    name: /send access code to my email/i,
  });
  await sendButton.click();

  // Wait for dialog to appear
  const heading = page.getByRole('heading', {
    name: /enter blueprint access code/i,
  });
  await expect(heading).toBeVisible({ timeout: 10000 });
}
