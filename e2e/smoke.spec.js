/**
 * Smoke test to verify Playwright setup works
 */

import { test, expect } from '@playwright/test';

test('smoke test - page loads', async ({ page }) => {
  // Just try to go to the page
  const response = await page.goto('/');

  // Log what we got
  console.log('Response status:', response?.status());
  console.log('Response URL:', response?.url());

  // Check we got a response
  expect(response?.status()).toBe(200);
});

test('smoke test - check page title', async ({ page }) => {
  await page.goto('/');

  // Get the page title
  const title = await page.title();
  console.log('Page title:', title);

  expect(title).toBeTruthy();
});

test('smoke test - check body has content', async ({ page }) => {
  await page.goto('/');

  // Get body content
  const bodyContent = await page.locator('body').innerHTML();
  console.log('Body content length:', bodyContent.length);
  console.log('Body content preview:', bodyContent.substring(0, 500));

  expect(bodyContent.length).toBeGreaterThan(0);
});
