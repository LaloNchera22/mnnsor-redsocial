import { test, expect } from '@playwright/test';

test.describe('End-to-End User Flow', () => {
  test('Signup -> Checkout -> Publish -> Flag -> Moderate', async ({ page }) => {
    // 1. Signup / Sign in
    await page.goto('/');
    await page.fill('input[type="email"]', 'e2e_user@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("PAY WITH CRYPTO & SIGN UP")');

    // Wait for redirect to feed
    await page.waitForURL('**/feed');
    expect(page.url()).toContain('/feed');

    // 2. Publish Post
    if (await page.locator('button:has-text("PUBLISH NEW CONTENT")').isVisible().catch(()=>false)) {
       await page.click('button:has-text("PUBLISH NEW CONTENT")');
    }
    await page.fill('input[placeholder="ENTER TITLE..."]', 'E2E TEST TITLE');
    await page.fill('textarea', 'This is an end-to-end test post.');
    await page.fill('input[placeholder="ENTER CATEGORY OR TAG..."]', 'E2E');

    await page.click('button:has-text("SUBMIT TO NETWORK")');

    // Check if post appears
    await expect(page.locator('text=E2E TEST TITLE')).toBeVisible();

    // 3. Flag Post
    await page.click('button:has-text("FLAG")');

    // Wait for toast
    await expect(page.locator('text=CONTENT FLAGGED FOR MODERATION.')).toBeVisible();

    // 4. Moderate (Admin)
    await page.goto('/admin');
    await page.waitForURL('**/admin');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Flagged Content Queue')).toBeVisible();

    // Assuming the flagged post shows up here
    await expect(page.locator('text=E2E TEST TITLE')).toBeVisible();
    await page.click('button:has-text("REMOVE CONTENT (BAN)")');

    // Should disappear
    await expect(page.locator('text=E2E TEST TITLE')).not.toBeVisible();
  });
});
