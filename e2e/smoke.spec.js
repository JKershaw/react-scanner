/**
 * Smoke test to verify basic Playwright setup
 *
 * Note: These tests must be run locally or in CI, not in Claude Code on the Web
 * due to browser proxy limitations.
 */

import { test, expect } from '@playwright/test';

test('smoke test - app loads with correct title', async ({ page }) => {
  // Use domcontentloaded since Vite's HMR keeps WebSocket connections open
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Verify page title
  await expect(page).toHaveTitle('React Flowchart Generator');
});

test('smoke test - root element exists', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Verify React root exists
  await expect(page.locator('#root')).toBeVisible();
});
