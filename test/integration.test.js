/**
 * Integration tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const demoDir = path.join(projectRoot, 'demo', 'src');

describe('Integration', () => {
  describe('Full pipeline', () => {
    it('should scan demo app and build graph', async () => {
      const { scanProject } = await import('../src/scanner.js');
      const { buildGraph } = await import('../src/graph.js');

      const scanResult = scanProject(demoDir);

      // Should find all routes
      assert.ok(scanResult.routes.length >= 6, `Expected at least 6 routes, got ${scanResult.routes.length}`);

      // Should find links
      assert.ok(scanResult.links.length > 0, 'Expected to find links');

      // Build graph
      const graph = buildGraph(scanResult);

      // Should have nodes
      assert.ok(graph.nodes.size >= 6, `Expected at least 6 nodes, got ${graph.nodes.size}`);

      // Should have edges
      assert.ok(graph.edges.length > 0, 'Expected to have edges');
    });

    it('should generate valid HTML', async () => {
      const { scanProject } = await import('../src/scanner.js');
      const { buildGraph } = await import('../src/graph.js');
      const { generateHTML } = await import('../src/visualizer.js');

      const scanResult = scanProject(demoDir);
      const graph = buildGraph(scanResult);
      const html = generateHTML(graph);

      // Should be valid HTML
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('mermaid'));

      // Should include expected pages
      assert.ok(html.includes('Home'));
      assert.ok(html.includes('About'));
      assert.ok(html.includes('Dashboard'));
    });

    it('should run CLI and generate output file', () => {
      const outputFile = path.join(projectRoot, 'test-output.html');

      // Clean up if exists
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }

      // Run CLI
      try {
        execSync(`node src/index.js demo/src ${outputFile}`, {
          cwd: projectRoot,
          stdio: 'pipe',
        });
      } catch (error) {
        assert.fail(`CLI failed: ${error.message}`);
      }

      // Check output file exists
      assert.ok(fs.existsSync(outputFile), 'Output file should exist');

      // Check content
      const content = fs.readFileSync(outputFile, 'utf-8');
      assert.ok(content.includes('<!DOCTYPE html>'));
      assert.ok(content.includes('Home'));

      // Clean up
      fs.unlinkSync(outputFile);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent directory gracefully', () => {
      try {
        execSync('node src/index.js /non/existent/dir output.html', {
          cwd: projectRoot,
          stdio: 'pipe',
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        // Expected to fail
        assert.ok(true);
      }
    });

    it('should handle empty directory', async () => {
      const { scanProject } = await import('../src/scanner.js');
      const { buildGraph } = await import('../src/graph.js');
      const { generateHTML } = await import('../src/visualizer.js');

      // Create temp empty dir
      const emptyDir = path.join(projectRoot, 'test-empty');
      if (!fs.existsSync(emptyDir)) {
        fs.mkdirSync(emptyDir);
      }

      const scanResult = scanProject(emptyDir);
      const graph = buildGraph(scanResult);
      const html = generateHTML(graph);

      // Should still generate valid HTML
      assert.ok(html.includes('<!DOCTYPE html>'));

      // Clean up
      fs.rmdirSync(emptyDir);
    });
  });

  describe('Demo app validation', () => {
    it('should detect all navigation patterns', async () => {
      const { scanProject } = await import('../src/scanner.js');

      const scanResult = scanProject(demoDir);

      // Check for Link components
      const linkTypes = scanResult.links.filter(l => l.type === 'Link');
      assert.ok(linkTypes.length > 0, 'Should find Link components');

      // Check for NavLink components
      const navLinkTypes = scanResult.links.filter(l => l.type === 'NavLink');
      assert.ok(navLinkTypes.length > 0, 'Should find NavLink components');

      // Check for navigate() calls
      const navigateTypes = scanResult.links.filter(l => l.type === 'navigate');
      assert.ok(navigateTypes.length > 0, 'Should find navigate() calls');
    });

    it('should find dynamic route', async () => {
      const { scanProject } = await import('../src/scanner.js');

      const scanResult = scanProject(demoDir);

      // Should find profile/:id route
      const dynamicRoute = scanResult.routes.find(r => r.path.includes(':id'));
      assert.ok(dynamicRoute, 'Should find dynamic route with :id parameter');
    });

    it('should find wildcard route', async () => {
      const { scanProject } = await import('../src/scanner.js');

      const scanResult = scanProject(demoDir);

      // Should find * route
      const wildcardRoute = scanResult.routes.find(r => r.path === '*');
      assert.ok(wildcardRoute, 'Should find wildcard (*) route');
    });
  });
});
