/**
 * E2E tests for React Flowchart Generator
 *
 * These tests verify the happy path user journey:
 * 1. Load the app
 * 2. Select a project
 * 3. View the flowchart
 * 4. Select nodes to find a path
 * 5. Generate test code
 */

import { test, expect } from '@playwright/test';

test.describe('React Flowchart Generator', () => {
  test('should load the app with welcome message', async ({ page }) => {
    await page.goto('/');

    // App header should be visible
    await expect(page.locator('h1')).toContainText('React Flowchart Generator');

    // Welcome message should be shown
    await expect(page.locator('.welcome h2')).toContainText('Welcome');
  });

  test('should show project selector with default projects', async ({ page }) => {
    await page.goto('/');

    // Project dropdown should exist
    const dropdown = page.locator('.project-dropdown');
    await expect(dropdown).toBeVisible();

    // Should have default projects in optgroup
    await expect(page.locator('optgroup[label="Default Projects"]')).toBeVisible();
    await expect(page.locator('option:has-text("Demo App")')).toBeVisible();
    await expect(page.locator('option:has-text("This Project")')).toBeVisible();
  });

  test('should load demo project and display flowchart', async ({ page }) => {
    await page.goto('/');

    // Select demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });

    // Wait for loading to complete
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Flowchart should be visible
    await expect(page.locator('.flowchart-viewer')).toBeVisible();

    // React Flow canvas should be rendered
    await expect(page.locator('.react-flow')).toBeVisible();

    // Should have nodes
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  });

  test('should display path selector after loading project', async ({ page }) => {
    await page.goto('/');

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Path selector should be visible
    await expect(page.locator('.path-selector')).toBeVisible();
    await expect(page.locator('.path-selector h3')).toContainText('Path Selection');

    // Initial state should prompt to click a node
    await expect(page.locator('.selection-item .value')).toContainText('Click a node');
  });

  test('should select start node when clicking flowchart node', async ({ page }) => {
    await page.goto('/');

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Click a node in the flowchart
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.click();

    // Start selection should update
    const startValue = page.locator('.selection-item').first().locator('.value');
    await expect(startValue).toHaveClass(/selected/);
  });

  test('should show test generator panel', async ({ page }) => {
    await page.goto('/');

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Test generator should be visible
    await expect(page.locator('.test-generator')).toBeVisible();
    await expect(page.locator('.test-generator h3')).toContainText('Test Generator');
  });

  test('should show planning mode toggle', async ({ page }) => {
    await page.goto('/');

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Planning mode should be visible
    await expect(page.locator('.planning-mode')).toBeVisible();
    await expect(page.locator('.planning-mode h3')).toContainText('Planning Mode');

    // Toggle should exist
    await expect(page.locator('.planning-mode .toggle')).toBeVisible();
  });

  test('should change project when clicking Change button', async ({ page }) => {
    await page.goto('/');

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Current project name should be shown
    await expect(page.locator('.project-name')).toContainText('demo');

    // Click change button
    await page.click('button:has-text("Change")');

    // Should return to project selector
    await expect(page.locator('.project-dropdown')).toBeVisible();
    await expect(page.locator('.welcome')).toBeVisible();
  });

  test('should display error for invalid custom path', async ({ page }) => {
    await page.goto('/');

    // Click custom path button
    await page.click('button:has-text("Custom Path")');

    // Enter invalid path
    await page.fill('input[placeholder*="project path"]', '/invalid/path');
    await page.click('button:has-text("Scan")');

    // Should show error
    await expect(page.locator('.error-banner')).toBeVisible({ timeout: 5000 });
  });

  test('should show flowchart legend', async ({ page }) => {
    await page.goto('/');

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Legend should be visible
    await expect(page.locator('.flowchart-legend')).toBeVisible();
    await expect(page.locator('.legend-item:has-text("Start")')).toBeVisible();
    await expect(page.locator('.legend-item:has-text("End")')).toBeVisible();
    await expect(page.locator('.legend-item:has-text("Path")')).toBeVisible();
  });
});
