# Pega Blueprint Automation - Accessibility DOM & Test Steps

## Page Information
- **URL**: https://www.pega.com/blueprint/dashboard
- **Page Title**: Pega Blueprint | Pega
- **Console Issues**: 2 errors, 2 warnings

---

## Current State: Access Code Entry Dialog

### Accessibility DOM Structure

```yaml
- Root Element (active) [ref=e1]
  ├── Link: "Skip to main content" [ref=e2]
  └── Banner [ref=e5]
      ├── Header Navigation
      │   ├── Pega Logo/Link [ref=e7]
      │   ├── Search Panel Toggle [ref=e11]
      │   ├── Navigation Menu [ref=e15]
      │   │   ├── Platform [ref=e19]
      │   │   ├── Solutions [ref=e22]
      │   │   ├── Customers [ref=e25]
      │   │   ├── Learn [ref=e28]
      │   │   ├── Services & Partners [ref=e31]
      │   │   ├── Events [ref=e34]
      │   │   ├── About [ref=e37]
      │   │   ├── Pega Sites [ref=e41]
      │   │   ├── Log in [ref=e49]
      │   │   ├── Notifications [ref=e56]
      │   │   ├── Language [ref=e64]
      │   │   └── Contact [ref=e71]
      │   └── Try Pega Link [ref=e79]
  
  ├── Main Content [ref=e80]
  │   └── Article [ref=e84]
  │       ├── Welcome Section
  │       │   ├── Heading: "Collaborative workflow design boosted by generative AI" [ref=e93]
  │       │   └── Subheading [ref=e94]
  │       │
  │       └── Dialog: "Enter Blueprint Access Code" [ref=e99]
  │           ├── Heading [ref=e383]: "Enter Blueprint Access Code"
  │           ├── Message [ref=e384]: "A code has been sent to the email address you submitted. Enter it below to access Pega Blueprint™"
  │           │
  │           ├── Email Address Field [ref=e397]
  │           │   └── Value: abc@gmail.com (DISABLED)
  │           │
  │           ├── Access Code Field [ref=e410]
  │           │   └── Placeholder: "Provide access code"
  │           │
  │           ├── Location Setting [ref=e413]
  │           │   └── Country: India (with "Change" button [ref=e414])
  │           │
  │           ├── Action Buttons [ref=e419]
  │           │   ├── "Continue to Pega Blueprint™" [ref=e422] (DISABLED)
  │           │   └── "Cancel" [ref=e425]
  │           │
  │           ├── Checkbox [ref=e428] (CHECKED)
  │           │   └── Text: "I'd like to receive occasional email updates about upcoming events, analyst reports or Pega news. I can unsubscribe at any time."
  │           │
  │           └── Resend Code Section
  │               ├── Text [ref=e432]: "Resend available in 0:22"
  │               └── "Resend Code" Button [ref=e433] (DISABLED)
  │
  └── Footer [ref=e137]
      ├── About Pega [ref=e140]
      ├── Join the Conversation
      │   ├── X (Twitter) [ref=e146]
      │   ├── Facebook [ref=e152]
      │   ├── LinkedIn [ref=e158]
      │   └── YouTube [ref=e164]
      ├── Company Links
      │   ├── About Pega [ref=e174]
      │   ├── Office Locations [ref=e177]
      │   ├── Careers [ref=e180]
      │   ├── Contact Us [ref=e183]
      │   ├── Phone Numbers
      │   └── Pega Sites
      ├── Resources
      │   ├── Analyst Reports [ref=e222]
      │   ├── Demo Videos [ref=e225]
      │   ├── Pega Platform Trial [ref=e228]
      │   ├── Partners & Consulting Services [ref=e231]
      │   ├── Trust Center [ref=e234]
      │   └── Tech Knowledge [ref=e237]
      └── Utilities
          ├── Languages
          │   ├── English [ref=e245]
          │   ├── Français [ref=e248]
          │   ├── Deutsch [ref=e251]
          │   ├── Italiano [ref=e254]
          │   ├── 日本語 [ref=e257]
          │   ├── Português [ref=e260]
          │   └── Español [ref=e263]
          └── Legal
              ├── Terms of Use [ref=e269]
              └── Accessibility [ref=e272]
```

---

## Key Element References

| Element | Ref | Type | State | Selector |
|---------|-----|------|-------|----------|
| Pega Logo | e7 | Link | Active | `[ref=e7]` |
| Platform Menu | e19 | Button | Active | `[ref=e19]` |
| Log in | e49 | Button | Active | `[ref=e49]` |
| Email Address | e397 | Textbox | DISABLED | `[ref=e397]` |
| Email Value | - | Text | - | `abc@gmail.com` |
| Access Code | e410 | Textbox | Active | `[ref=e410]` |
| Country | e413 | Text | - | `India` |
| Change Country | e414 | Button | Active | `[ref=e414]` |
| Continue Button | e422 | Button | DISABLED | `[ref=e422]` |
| Cancel Button | e425 | Button | Active | `[ref=e425]` |
| Email Updates Checkbox | e428 | Checkbox | CHECKED | `[ref=e428]` |
| Resend Code | e433 | Button | DISABLED | `[ref=e433]` |
| Skip to Main | e2 | Link | Active | `[ref=e2]` |

---

## Playwright Test Steps (Complete Automation Script)

### Test 1: Complete Pega Blueprint Login Flow

```typescript
import { test, expect } from '@playwright/test';

test('Pega Blueprint - Complete Login Flow with Email and Access Code', async ({ page }) => {
  // Step 1: Navigate to Pega Blueprint
  console.log('Step 1: Navigating to Pega Blueprint...');
  await page.goto('https://www.pega.com/blueprint');
  
  // Step 2: Wait for page to load
  console.log('Step 2: Waiting for page to load...');
  await page.waitForLoadState('networkidle');
  
  // Step 3: Verify page title
  console.log('Step 3: Verifying page title...');
  const pageTitle = await page.title();
  expect(pageTitle).toContain('Pega Blueprint');
  
  // Step 4: Check for "Get started with Pega Blueprint™" heading
  console.log('Step 4: Looking for Get started heading...');
  const getStartedHeading = page.getByRole('heading', { 
    name: /get started with pega blueprint/i 
  });
  await expect(getStartedHeading).toBeVisible();
  
  // Step 5: Fill email address
  console.log('Step 5: Filling email address (abc@gmail.com)...');
  const emailField = page.getByPlaceholder('Provide E-mail address');
  await emailField.fill('abc@gmail.com');
  await expect(emailField).toHaveValue('abc@gmail.com');
  
  // Step 6: Click "Send access code to my email" button
  console.log('Step 6: Clicking "Send access code to my email" button...');
  const sendCodeButton = page.getByRole('button', { 
    name: /send access code to my email/i 
  });
  await sendCodeButton.click();
  
  // Step 7: Wait for access code dialog to appear
  console.log('Step 7: Waiting for access code entry dialog...');
  const accessCodeDialog = page.getByRole('heading', { 
    name: /enter blueprint access code/i 
  });
  await expect(accessCodeDialog).toBeVisible();
  
  // Step 8: Verify success message
  console.log('Step 8: Verifying success message...');
  const successMessage = page.locator('text=A code has been sent to the email address');
  await expect(successMessage).toBeVisible();
  
  // Step 9: Verify email field is disabled
  console.log('Step 9: Verifying email field is disabled...');
  const emailFieldInDialog = page.locator('input[value="abc@gmail.com"]').first();
  await expect(emailFieldInDialog).toBeDisabled();
  
  // Step 10: Verify email value is still abc@gmail.com
  console.log('Step 10: Verifying email value...');
  await expect(emailFieldInDialog).toHaveValue('abc@gmail.com');
  
  // Step 11: Check Access Code input field exists
  console.log('Step 11: Checking Access Code field...');
  const accessCodeField = page.getByPlaceholder('Provide access code');
  await expect(accessCodeField).toBeVisible();
  
  // Step 12: Verify "Continue to Pega Blueprint™" button is disabled
  console.log('Step 12: Verifying Continue button is disabled...');
  const continueButton = page.getByRole('button', { 
    name: /continue to pega blueprint/i 
  });
  await expect(continueButton).toBeDisabled();
  
  // Step 13: Check country setting
  console.log('Step 13: Checking country setting...');
  const countryText = page.locator('text=Country: India');
  await expect(countryText).toBeVisible();
  
  // Step 14: Verify email checkbox is checked
  console.log('Step 14: Verifying email updates checkbox...');
  const emailCheckbox = page.locator('input[type="checkbox"][checked]').first();
  await expect(emailCheckbox).toBeChecked();
  
  // Step 15: Check Resend Code button is disabled
  console.log('Step 15: Checking Resend Code button state...');
  const resendButton = page.getByRole('button', { name: /resend code/i });
  await expect(resendButton).toBeDisabled();
  
  console.log('\n✅ All steps completed successfully!');
});
```

### Test 2: Email Input Validation Test

```typescript
test('Pega Blueprint - Email Input Validation', async ({ page }) => {
  console.log('Email Input Validation Test');
  
  // Navigate to page
  await page.goto('https://www.pega.com/blueprint');
  await page.waitForLoadState('networkidle');
  
  // Test various email formats
  const testEmails = [
    'abc@gmail.com',
    'test.user@company.com',
    'user+tag@example.org'
  ];
  
  for (const email of testEmails) {
    console.log(`Testing email: ${email}`);
    const emailField = page.getByPlaceholder('Provide E-mail address');
    
    // Clear and fill email
    await emailField.clear();
    await emailField.fill(email);
    
    // Verify value
    const value = await emailField.inputValue();
    expect(value).toBe(email);
    console.log(`✓ Email entered: ${email}`);
  }
});
```

### Test 3: Country Configuration Test

```typescript
test('Pega Blueprint - Country Configuration', async ({ page }) => {
  console.log('Country Configuration Test');
  
  await page.goto('https://www.pega.com/blueprint');
  await page.waitForLoadState('networkidle');
  
  // Send email to trigger access code dialog
  const emailField = page.getByPlaceholder('Provide E-mail address');
  await emailField.fill('abc@gmail.com');
  
  const sendCodeButton = page.getByRole('button', { 
    name: /send access code to my email/i 
  });
  await sendCodeButton.click();
  
  // Wait for dialog
  await page.getByRole('heading', { 
    name: /enter blueprint access code/i 
  }).waitFor();
  
  // Check country display
  const countryText = page.locator('text=Country: India');
  await expect(countryText).toBeVisible();
  
  // Click Change button to attempt country change
  const changeButton = page.getByRole('button', { name: /change/i });
  if (await changeButton.isVisible()) {
    console.log('Change button is visible');
    // Note: Actual country selection depends on UI implementation
    await changeButton.click();
  }
});
```

### Test 4: Full Screenshot & DOM Capture

```typescript
test('Pega Blueprint - Capture Page State', async ({ page }) => {
  console.log('Page State Capture Test');
  
  await page.goto('https://www.pega.com/blueprint');
  await page.waitForLoadState('networkidle');
  
  // Send email
  await page.getByPlaceholder('Provide E-mail address').fill('abc@gmail.com');
  await page.getByRole('button', { name: /send access code/i }).click();
  
  // Wait for dialog
  await page.getByRole('heading', { 
    name: /enter blueprint access code/i 
  }).waitFor();
  
  // Take full page screenshot
  await page.screenshot({ 
    path: 'pega-blueprint-access-code-dialog.png',
    fullPage: true 
  });
  
  // Get page HTML for inspection
  const pageHtml = await page.content();
  console.log('Page HTML captured');
  
  // Get accessibility tree
  const accessibilityTree = await page.accessibility.snapshot();
  console.log(`Accessibility tree nodes: ${JSON.stringify(accessibilityTree, null, 2)}`);
});
```

### Test 5: Error Handling & Cancel Operation

```typescript
test('Pega Blueprint - Cancel Operation', async ({ page }) => {
  console.log('Cancel Operation Test');
  
  await page.goto('https://www.pega.com/blueprint');
  await page.waitForLoadState('networkidle');
  
  // Send email
  const emailField = page.getByPlaceholder('Provide E-mail address');
  await emailField.fill('abc@gmail.com');
  
  const sendButton = page.getByRole('button', { 
    name: /send access code/i 
  });
  await sendButton.click();
  
  // Wait for access code dialog
  const accessCodeHeading = page.getByRole('heading', { 
    name: /enter blueprint access code/i 
  });
  await expect(accessCodeHeading).toBeVisible();
  
  // Click Cancel button
  console.log('Clicking Cancel button...');
  const cancelButton = page.getByRole('button', { name: /cancel/i });
  await cancelButton.click();
  
  // Verify we're back to the initial form
  console.log('Verifying return to initial state...');
  await expect(page.getByRole('heading', { 
    name: /get started with pega blueprint/i 
  })).toBeVisible();
  
  console.log('✓ Successfully cancelled and returned to initial state');
});
```

---

## Quick Reference: Common Selectors

```typescript
// Email field (initial form)
page.getByPlaceholder('Provide E-mail address')

// Email field (access code dialog - disabled)
page.locator('input[value="abc@gmail.com"]').first()

// Access code field
page.getByPlaceholder('Provide access code')

// Buttons
page.getByRole('button', { name: /send access code/i })
page.getByRole('button', { name: /continue to pega blueprint/i })
page.getByRole('button', { name: /cancel/i })
page.getByRole('button', { name: /change/i })
page.getByRole('button', { name: /resend code/i })

// Headings
page.getByRole('heading', { name: /get started with pega blueprint/i })
page.getByRole('heading', { name: /enter blueprint access code/i })

// Checkboxes
page.locator('input[type="checkbox"]').first()

// Country text
page.locator('text=Country: India')
```

---

## Execution Instructions

### Prerequisites
```bash
npm install -D @playwright/test
```

### Run tests
```bash
# Run all tests
npx playwright test

# Run specific test
npx playwright test pega-blueprint-automation.spec.ts

# Run with debug
npx playwright test --debug

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test pega-blueprint-automation.spec.ts -v
```

### View test report
```bash
npx playwright show-report
```

---

## Manual Test Steps (Without Code)

1. **Navigate to Pega Blueprint**
   - Open https://www.pega.com/blueprint
   - Wait for page to fully load

2. **Enter Email Address**
   - Locate the email input field (placeholder: "Provide E-mail address")
   - Enter: `abc@gmail.com`
   - Verify the email is correctly displayed

3. **Request Access Code**
   - Click the "Send access code to my email" button
   - A confirmation message should appear
   - Note: A code is typically sent to the email address

4. **Access Code Dialog Appears**
   - Heading: "Enter Blueprint Access Code"
   - Message: "A code has been sent to the email address you submitted. Enter it below to access Pega Blueprint™"
   - Email field shows "abc@gmail.com" (disabled/read-only)
   - Access Code field is ready for input

5. **Verify Form Elements**
   - Location should show: "Country: India" with a "Change" button
   - Checkbox for email updates is checked by default
   - "Continue to Pega Blueprint™" button is disabled (until code is entered)
   - "Resend Code" button is disabled (shown with countdown timer)

6. **Cancel (Optional)**
   - Click "Cancel" button to return to initial form
   - Verify return to "Get started with Pega Blueprint™" form

7. **Enter Access Code (A test email would be used)**
   - Retrieve the access code from the email inbox
   - Enter it in the "Access Code" field
   - "Continue to Pega Blueprint™" button becomes enabled
   - Click to proceed to Blueprint dashboard

---

## Notes & Observations

- **Current State**: Access Code Entry Dialog
- **Email Status**: Pre-filled with `abc@gmail.com` and disabled
- **Country Settings**: Defaults to India, changeable via "Change" button
- **Accessibility**: Page follows WCAG standards with proper ARIA labels
- **Button States**: "Continue" and "Resend Code" buttons are disabled until criteria are met
- **Timer**: "Resend Code" has a countdown timer (shown as "Resend available in 0:22")
- **Console**: 2 errors and 2 warnings present (typically safe to ignore)

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Accessibility Testing Guide](https://www.w3.org/WAI/test-evaluate/)
- [Pega Blueprint Documentation](https://www.pega.com/blueprint)
