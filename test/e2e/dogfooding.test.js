/**
 * Dogfooding tests - the tool analyzing itself
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanProject } from '../../src/core/scanner.js';
import { buildGraph } from '../../src/core/graph.js';
import { generateHTML } from '../../src/core/visualizer.js';
import { validateProject, scanProjectFiles } from '../../src/server/file-system.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');

describe('Dogfooding', () => {
  describe('Self-analysis', () => {
    it('should validate itself as a React project', () => {
      const isValid = validateProject(projectRoot);
      assert.strictEqual(isValid, true, 'Should be a valid React project');
    });

    it('should scan its own UI directory', () => {
      const uiDir = path.join(projectRoot, 'src', 'ui');
      const result = scanProject(uiDir);

      // Should find React files
      assert.ok(result.files.length > 0, 'Should find UI files');

      // Should find at least the App component
      const hasAppFile = result.files.some(f => f.includes('App'));
      assert.ok(hasAppFile, 'Should find App.jsx');
    });

    it('should build graph from own codebase', () => {
      const uiDir = path.join(projectRoot, 'src', 'ui');
      const scanResult = scanProject(uiDir);
      const graph = buildGraph(scanResult);

      // Should create valid graph
      assert.ok(graph.nodes instanceof Map, 'Should have nodes Map');
      assert.ok(Array.isArray(graph.edges), 'Should have edges array');
    });

    it('should generate HTML for own codebase', () => {
      const uiDir = path.join(projectRoot, 'src', 'ui');
      const scanResult = scanProject(uiDir);
      const graph = buildGraph(scanResult);
      const html = generateHTML(graph, { title: 'Self-Analysis' });

      // Should generate valid HTML
      assert.ok(html.includes('<!DOCTYPE html>'), 'Should be valid HTML');
      assert.ok(html.includes('Self-Analysis'), 'Should include title');
      assert.ok(html.includes('mermaid'), 'Should include Mermaid');
    });

    it('should use file-system service to scan itself', () => {
      const result = scanProjectFiles(projectRoot);

      assert.ok(result.projectPath === projectRoot, 'Should have correct project path');
      assert.ok(result.graph, 'Should have graph data');
      assert.ok(result.graph.nodes, 'Should have nodes');
    });
  });

  describe('Demo app analysis', () => {
    it('should scan demo app successfully', () => {
      const demoDir = path.join(projectRoot, 'demo');
      const result = scanProjectFiles(demoDir);

      assert.ok(result.scanResult.routeCount >= 6, 'Should find demo routes');
      assert.ok(result.scanResult.linkCount > 0, 'Should find demo links');
    });

    it('should generate flowchart for demo app', () => {
      const demoSrc = path.join(projectRoot, 'demo', 'src');
      const scanResult = scanProject(demoSrc);
      const graph = buildGraph(scanResult);
      const html = generateHTML(graph);

      // Check for expected pages
      assert.ok(html.includes('Home'), 'Should include Home page');
      assert.ok(html.includes('About'), 'Should include About page');
      assert.ok(html.includes('Dashboard'), 'Should include Dashboard page');
    });
  });

  describe('Meta capabilities', () => {
    it('should detect its own components', () => {
      const uiDir = path.join(projectRoot, 'src', 'ui');
      const result = scanProject(uiDir);

      // Check for component files
      const components = result.files.filter(f => f.includes('components'));
      assert.ok(components.length > 0, 'Should find component files');
    });

    it('should handle deeply nested structures', () => {
      const result = scanProject(projectRoot);

      // Should scan through multiple directories
      assert.ok(result.files.length > 10, 'Should find many files');
    });
  });
});
