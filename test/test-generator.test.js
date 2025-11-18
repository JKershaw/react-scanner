/**
 * Test Generator module tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  findAllPaths,
  getEdge,
  buildTestCase,
  generatePlaywrightTest,
  generateCypressTest,
  generateTestCases
} from '../src/test-generator.js';

describe('TestGenerator', () => {
  // Sample graph for testing
  const sampleGraph = {
    nodes: new Map([
      ['root', { id: 'root', path: '/', component: 'Home', type: 'page' }],
      ['about', { id: 'about', path: '/about', component: 'About', type: 'page' }],
      ['dashboard', { id: 'dashboard', path: '/dashboard', component: 'Dashboard', type: 'dashboard' }],
      ['profile', { id: 'profile', path: '/profile', component: 'Profile', type: 'page' }],
    ]),
    edges: [
      { from: 'root', to: 'about', type: 'Link', action: 'clicks link' },
      { from: 'root', to: 'dashboard', type: 'Link', action: 'clicks link' },
      { from: 'dashboard', to: 'profile', type: 'button', action: 'clicks button' },
      { from: 'about', to: 'root', type: 'Link', action: 'clicks link' },
    ],
  };

  describe('findAllPaths', () => {
    it('should find direct path between adjacent nodes', () => {
      const paths = findAllPaths(sampleGraph, 'root', 'about');
      assert.strictEqual(paths.length, 1);
      assert.deepStrictEqual(paths[0], ['root', 'about']);
    });

    it('should find multi-step path', () => {
      const paths = findAllPaths(sampleGraph, 'root', 'profile');
      assert.strictEqual(paths.length, 1);
      assert.deepStrictEqual(paths[0], ['root', 'dashboard', 'profile']);
    });

    it('should return empty array if no path exists', () => {
      const paths = findAllPaths(sampleGraph, 'profile', 'about');
      assert.strictEqual(paths.length, 0);
    });

    it('should return empty array for non-existent nodes', () => {
      const paths = findAllPaths(sampleGraph, 'root', 'nonexistent');
      assert.strictEqual(paths.length, 0);
    });

    it('should limit number of paths found', () => {
      const paths = findAllPaths(sampleGraph, 'root', 'about', 1);
      assert.strictEqual(paths.length, 1);
    });

    it('should sort paths by length', () => {
      // Create a graph with multiple paths
      const multiPathGraph = {
        nodes: new Map([
          ['a', { id: 'a' }],
          ['b', { id: 'b' }],
          ['c', { id: 'c' }],
          ['d', { id: 'd' }],
        ]),
        edges: [
          { from: 'a', to: 'd' }, // Direct path (length 2)
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'c', to: 'd' }, // Longer path (length 4)
        ],
      };

      const paths = findAllPaths(multiPathGraph, 'a', 'd');
      assert.strictEqual(paths.length, 2);
      assert.strictEqual(paths[0].length, 2); // Shortest first
      assert.strictEqual(paths[1].length, 4);
    });
  });

  describe('getEdge', () => {
    it('should find edge between nodes', () => {
      const edge = getEdge(sampleGraph.edges, 'root', 'about');
      assert.ok(edge);
      assert.strictEqual(edge.type, 'Link');
    });

    it('should return null for non-existent edge', () => {
      const edge = getEdge(sampleGraph.edges, 'about', 'dashboard');
      assert.strictEqual(edge, null);
    });
  });

  describe('buildTestCase', () => {
    it('should build test case from path', () => {
      const graphData = {
        nodes: Object.fromEntries(sampleGraph.nodes),
        edges: sampleGraph.edges,
      };

      const testCase = buildTestCase(['root', 'dashboard', 'profile'], graphData);

      assert.ok(testCase.id);
      assert.ok(testCase.name.includes('Home'));
      assert.ok(testCase.name.includes('Profile'));
      assert.ok(testCase.steps.length >= 3);
      assert.strictEqual(testCase.nodeIds.length, 3);
    });

    it('should include navigate action for first step', () => {
      const graphData = {
        nodes: Object.fromEntries(sampleGraph.nodes),
        edges: sampleGraph.edges,
      };

      const testCase = buildTestCase(['root', 'about'], graphData);
      const firstStep = testCase.steps[0];

      assert.strictEqual(firstStep.action, 'navigate');
      assert.strictEqual(firstStep.target, '/');
    });

    it('should include assertions for URL', () => {
      const graphData = {
        nodes: Object.fromEntries(sampleGraph.nodes),
        edges: sampleGraph.edges,
      };

      const testCase = buildTestCase(['root', 'about'], graphData);
      const assertions = testCase.steps.filter(s => s.action === 'assert');

      assert.ok(assertions.length > 0);
    });
  });

  describe('generatePlaywrightTest', () => {
    it('should generate valid Playwright test code', () => {
      const testCase = {
        name: 'Home to About',
        steps: [
          { action: 'navigate', target: '/', description: 'Navigate to /' },
          { action: 'click', target: '/about', description: 'Click about', actionType: 'clicks link' },
          { action: 'assert', type: 'url', expected: '/about', description: 'Verify URL' },
        ],
      };

      const code = generatePlaywrightTest(testCase);

      assert.ok(code.includes("import { test, expect }"));
      assert.ok(code.includes("test('Home to About'"));
      assert.ok(code.includes("page.goto"));
      assert.ok(code.includes("page.click"));
      assert.ok(code.includes("expect(page).toHaveURL"));
    });

    it('should use custom baseUrl', () => {
      const testCase = {
        name: 'Test',
        steps: [
          { action: 'navigate', target: '/', description: 'Navigate' },
        ],
      };

      const code = generatePlaywrightTest(testCase, { baseUrl: 'http://example.com' });

      assert.ok(code.includes('http://example.com/'));
    });
  });

  describe('generateCypressTest', () => {
    it('should generate valid Cypress test code', () => {
      const testCase = {
        name: 'Home to About',
        steps: [
          { action: 'navigate', target: '/', description: 'Navigate to /' },
          { action: 'click', target: '/about', description: 'Click about' },
          { action: 'assert', type: 'url', expected: '/about', description: 'Verify URL' },
        ],
      };

      const code = generateCypressTest(testCase);

      assert.ok(code.includes("describe('Home to About'"));
      assert.ok(code.includes("cy.visit"));
      assert.ok(code.includes("cy.get"));
      assert.ok(code.includes("cy.url().should('include'"));
    });
  });

  describe('generateTestCases', () => {
    it('should generate test cases for all paths', () => {
      const graphData = {
        nodes: Object.fromEntries(sampleGraph.nodes),
        edges: sampleGraph.edges,
      };

      const testCases = generateTestCases(graphData, 'root', 'profile');

      assert.strictEqual(testCases.length, 1);
      assert.ok(testCases[0].steps.length > 0);
    });

    it('should handle Map nodes', () => {
      const testCases = generateTestCases(sampleGraph, 'root', 'about');

      assert.strictEqual(testCases.length, 1);
    });
  });
});
