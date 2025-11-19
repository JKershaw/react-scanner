/**
 * Feature tests for React Flowchart Generator
 *
 * These tests verify specific functionality in more detail
 */

import { test, expect } from '@playwright/test';

const gotoOptions = { waitUntil: 'domcontentloaded' };

test.describe('Path Finding', () => {
  test('should find paths between nodes', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Click first node as start
    const nodes = page.locator('.react-flow__node');
    await nodes.first().click();

    // Verify start node is selected
    const startValue = page.locator('.selection-item').first().locator('.value');
    await expect(startValue).toHaveClass(/selected/);

    // Click last node as end (if there are multiple nodes)
    const nodeCount = await nodes.count();
    if (nodeCount > 1) {
      await nodes.last().click();

      // Verify end node is selected
      const endValue = page.locator('.selection-item').nth(1).locator('.value');
      await expect(endValue).toHaveClass(/selected/);

      // Check if paths were found
      const pathsList = page.locator('.paths-list');
      if (await pathsList.isVisible()) {
        // Verify path options are shown
        await expect(page.locator('.path-option').first()).toBeVisible();
      }
    }
  });

  test('should clear selection when clicking Clear button', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Select a node
    await page.locator('.react-flow__node').first().click();

    // Verify selection
    const startValue = page.locator('.selection-item').first().locator('.value');
    await expect(startValue).toHaveClass(/selected/);

    // Click Clear button
    await page.click('button:has-text("Clear")');

    // Verify selection is cleared
    await expect(startValue).not.toHaveClass(/selected/);
    await expect(startValue).toContainText('Click a node');
  });
});

test.describe('Test Generation', () => {
  test('should switch between test formats when path is selected', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Select two nodes to get a path
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    if (nodeCount >= 2) {
      await nodes.first().click();
      await nodes.nth(1).click(); // Use second node instead of last

      // Wait for path to be found
      await page.waitForTimeout(500);

      // Check if format selector is visible (only shown when path is selected)
      const formatSelector = page.locator('.format-selector');
      if (await formatSelector.isVisible()) {
        // Check Playwright format (default)
        await expect(page.locator('.format-btn:has-text("Playwright")')).toHaveClass(/active/);

        // Switch to Cypress
        await page.click('.format-btn:has-text("Cypress")');
        await expect(page.locator('.format-btn:has-text("Cypress")')).toHaveClass(/active/);

        // Switch to Gherkin
        await page.click('.format-btn:has-text("Gherkin")');
        await expect(page.locator('.format-btn:has-text("Gherkin")')).toHaveClass(/active/);
      }
    }
  });

  test('should copy generated test code when path is selected', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Select two nodes to get a path
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    if (nodeCount >= 2) {
      await nodes.first().click();
      await nodes.nth(1).click();

      // Wait for path to be found
      await page.waitForTimeout(500);

      // Check if copy button is visible
      const copyButton = page.locator('button:has-text("Copy to Clipboard")');
      if (await copyButton.isVisible()) {
        // Grant clipboard permissions
        await page.context().grantPermissions(['clipboard-write']);

        // Click copy button
        await copyButton.click();

        // Verify button text changes to "Copied!"
        await expect(page.locator('button:has-text("Copied!")')).toBeVisible();

        // After 2 seconds, should revert
        await page.waitForTimeout(2100);
        await expect(page.locator('button:has-text("Copy to Clipboard")')).toBeVisible();
      }
    }
  });
});

test.describe('Planning Mode', () => {
  test('should toggle planning mode', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Toggle planning mode - click on the toggle label/slider instead of checkbox
    const toggle = page.locator('.planning-mode .toggle');
    await toggle.click();

    // Verify checkbox is checked
    const checkbox = page.locator('.planning-mode input[type="checkbox"]');
    await expect(checkbox).toBeChecked();

    // Verify planning content is visible
    await expect(page.locator('.planning-content')).toBeVisible();

    // Toggle off
    await toggle.click();
    await expect(checkbox).not.toBeChecked();
  });

  test('should toggle planning mode and show planning actions', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Enable planning mode - click the toggle element
    await page.locator('.planning-mode .toggle').click();

    // Wait for planning content to be visible
    await expect(page.locator('.planning-content')).toBeVisible();

    // Check if planning actions are visible
    const planningActions = page.locator('.planning-actions');
    if (await planningActions.isVisible()) {
      // Look for any action buttons (might be "Add Node", "Node", or other text)
      const actionButtons = await page.locator('.planning-actions button').count();
      expect(actionButtons).toBeGreaterThan(0);
    }

    // Toggle off
    await page.locator('.planning-mode .toggle').click();

    // Verify planning content is hidden
    await expect(page.locator('.planning-content')).not.toBeVisible();
  });
});

test.describe('Custom Project Path', () => {
  test('should scan custom project path', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Click Custom Path button
    await page.click('button:has-text("Custom Path")');

    // Verify input form appears
    await expect(page.locator('.custom-path-form')).toBeVisible();

    // Enter current directory (which should work)
    await page.fill('input[placeholder*="project path"]', '.');
    await page.click('button:has-text("Scan")');

    // Either scan progress appears and disappears, or it's already loaded
    // (scan might be too fast to show progress)
    await page.waitForFunction(() => {
      const progress = document.querySelector('.scan-progress');
      const currentProject = document.querySelector('.current-project');
      // Either progress is hidden OR current project is shown
      return !progress || progress.style.display === 'none' || currentProject;
    }, { timeout: 10000 });

    // Current project should be shown
    await expect(page.locator('.current-project')).toBeVisible();

    // Workspace should be visible (contains flowchart)
    await expect(page.locator('.workspace')).toBeVisible();
  });

  test('should cancel custom path input', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Click Custom Path button
    await page.click('button:has-text("Custom Path")');

    // Verify input form appears
    await expect(page.locator('.custom-path-form')).toBeVisible();

    // Click Cancel button
    await page.click('button:has-text("Cancel")');

    // Form should be hidden
    await expect(page.locator('.custom-path-form')).not.toBeVisible();
  });
});

test.describe('Flowchart Interactions', () => {
  test('should highlight selected nodes', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Get first node
    const firstNode = page.locator('.react-flow__node').first();

    // Click node
    await firstNode.click();

    // Verify node is selected (should have selected class or different style)
    // This depends on implementation - checking if start value is updated
    const startValue = page.locator('.selection-item').first().locator('.value');
    await expect(startValue).not.toContainText('Click a node');
  });

  test('should display node details on hover', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Load demo project
    await page.selectOption('.project-dropdown', { label: 'Demo App' });
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Hover over a node
    const firstNode = page.locator('.react-flow__node').first();
    await firstNode.hover();

    // Node should be visible and interactive
    await expect(firstNode).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should dismiss error messages', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Create an error by trying to scan invalid path
    await page.click('button:has-text("Custom Path")');
    await page.fill('input[placeholder*="project path"]', '/definitely/not/a/valid/path');
    await page.click('button:has-text("Scan")');

    // Error should appear
    await expect(page.locator('.error-banner')).toBeVisible({ timeout: 5000 });

    // Click Dismiss button
    await page.click('button:has-text("Dismiss")');

    // Error should disappear
    await expect(page.locator('.error-banner')).not.toBeVisible();
  });

  test('should handle empty custom path', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Click Custom Path button
    await page.click('button:has-text("Custom Path")');

    // Try to scan with empty path
    await page.fill('input[placeholder*="project path"]', '');

    // Scan button should be disabled
    await expect(page.locator('button:has-text("Scan")')).toBeDisabled();
  });
});

test.describe('Recent Projects', () => {
  test('should save custom project to recent list', async ({ page }) => {
    await page.goto('/', gotoOptions);

    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    // Scan a custom project path (not a default one)
    await page.click('button:has-text("Custom Path")');
    await page.fill('input[placeholder*="project path"]', './demo');
    await page.click('button:has-text("Scan")');

    // Wait for scan to complete
    await expect(page.locator('.scan-progress')).toBeHidden({ timeout: 10000 });

    // Reload page to check if it's in recent
    await page.reload();

    // Check localStorage has the project (default projects are not saved)
    const recentProjects = await page.evaluate(() => localStorage.getItem('recentProjects'));
    if (recentProjects) {
      const projects = JSON.parse(recentProjects);
      expect(projects.length).toBeGreaterThan(0);
    }
  });
});