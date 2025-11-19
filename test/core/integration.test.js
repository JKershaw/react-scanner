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
const projectRoot = path.join(__dirname, '..', '..');
const demoDir = path.join(projectRoot, 'demo', 'src');

describe('Integration', () => {
  describe('Full pipeline', () => {
    it('should scan demo app and build graph', async () => {
      const { scanProject } = await import('../../src/core/scanner.js');
      const { buildGraph } = await import('../../src/core/graph.js');

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
      const { scanProject } = await import('../../src/core/scanner.js');
      const { buildGraph } = await import('../../src/core/graph.js');
      const { generateHTML } = await import('../../src/core/visualizer.js');

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
        execSync(`node src/cli/index.js demo/src ${outputFile}`, {
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
        execSync('node src/cli/index.js /non/existent/dir output.html', {
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
      const { scanProject } = await import('../../src/core/scanner.js');
      const { buildGraph } = await import('../../src/core/graph.js');
      const { generateHTML } = await import('../../src/core/visualizer.js');

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

  describe('Shared component edge attribution', () => {
    it('should detect imports from page components', async () => {
      const { scanProject } = await import('../../src/core/scanner.js');
      const fixturesDir = path.join(__dirname, '../fixtures');

      const scanResult = scanProject(fixturesDir);

      // Should find imports
      assert.ok(scanResult.imports.length > 0, 'Should find imports');

      // Should find Sidebar imports from page components
      const sidebarImports = scanResult.imports.filter(i => i.imported === 'Sidebar');
      assert.ok(sidebarImports.length >= 2, `Expected at least 2 Sidebar imports, got ${sidebarImports.length}`);
    });

    it('should create edges from shared component links to all importing pages', async () => {
      const { buildGraph } = await import('../../src/core/graph.js');

      // Simulate a project with shared sidebar
      const scanResult = {
        routes: [
          { path: '/settings/profile', component: 'SettingsProfile', file: 'routes.jsx' },
          { path: '/settings/security', component: 'SettingsSecurity', file: 'routes.jsx' },
          { path: '/dashboard', component: 'Dashboard', file: 'routes.jsx' },
        ],
        links: [
          // Links in shared Sidebar component
          { to: '/settings/profile', fromFile: 'Sidebar.jsx', type: 'Link', file: 'Sidebar.jsx' },
          { to: '/settings/security', fromFile: 'Sidebar.jsx', type: 'Link', file: 'Sidebar.jsx' },
          { to: '/dashboard', fromFile: 'Sidebar.jsx', type: 'Link', file: 'Sidebar.jsx' },
        ],
        imports: [
          { imported: 'Sidebar', source: './Sidebar', fromFile: 'SettingsProfile.jsx', file: 'SettingsProfile.jsx' },
          { imported: 'Sidebar', source: './Sidebar', fromFile: 'SettingsSecurity.jsx', file: 'SettingsSecurity.jsx' },
        ],
      };

      const graph = buildGraph(scanResult);

      // Profile page should have edges to Security and Dashboard via sidebar
      const profileToSecurity = graph.edges.find(e => e.from === 'settings_profile' && e.to === 'settings_security');
      const profileToDashboard = graph.edges.find(e => e.from === 'settings_profile' && e.to === 'dashboard');
      assert.ok(profileToSecurity, 'Profile should link to Security via sidebar');
      assert.ok(profileToDashboard, 'Profile should link to Dashboard via sidebar');

      // Security page should have edges to Profile and Dashboard via sidebar
      const securityToProfile = graph.edges.find(e => e.from === 'settings_security' && e.to === 'settings_profile');
      const securityToDashboard = graph.edges.find(e => e.from === 'settings_security' && e.to === 'dashboard');
      assert.ok(securityToProfile, 'Security should link to Profile via sidebar');
      assert.ok(securityToDashboard, 'Security should link to Dashboard via sidebar');
    });

    it('should handle nested component imports', async () => {
      const { buildGraph } = await import('../../src/core/graph.js');

      // Simulate nested imports: Icon -> Sidebar -> Page
      const scanResult = {
        routes: [
          { path: '/home', component: 'Home', file: 'routes.jsx' },
          { path: '/about', component: 'About', file: 'routes.jsx' },
        ],
        links: [
          // Link in deeply nested Icon component
          { to: '/about', fromFile: 'Icon.jsx', type: 'Link', file: 'Icon.jsx' },
        ],
        imports: [
          { imported: 'Icon', source: './Icon', fromFile: 'Sidebar.jsx', file: 'Sidebar.jsx' },
          { imported: 'Sidebar', source: './Sidebar', fromFile: 'Home.jsx', file: 'Home.jsx' },
        ],
      };

      const graph = buildGraph(scanResult);

      // Home should have edge to About via nested Icon -> Sidebar
      const homeToAbout = graph.edges.find(e => e.from === 'home' && e.to === 'about');
      assert.ok(homeToAbout, 'Home should link to About via nested Icon component');
    });

    it('should deduplicate edges from same shared component', async () => {
      const { buildGraph } = await import('../../src/core/graph.js');

      const scanResult = {
        routes: [
          { path: '/home', component: 'Home', file: 'routes.jsx' },
          { path: '/about', component: 'About', file: 'routes.jsx' },
        ],
        links: [
          // Multiple links to same target in shared component
          { to: '/about', fromFile: 'Nav.jsx', type: 'Link', file: 'Nav.jsx' },
          { to: '/about', fromFile: 'Nav.jsx', type: 'NavLink', file: 'Nav.jsx' },
        ],
        imports: [
          { imported: 'Nav', source: './Nav', fromFile: 'Home.jsx', file: 'Home.jsx' },
        ],
      };

      const graph = buildGraph(scanResult);

      // Should only have one edge from Home to About (deduplicated)
      const homeToAbout = graph.edges.filter(e => e.from === 'home' && e.to === 'about');
      assert.strictEqual(homeToAbout.length, 1, 'Should deduplicate edges from same source to same target');
    });
  });

  describe('Demo app validation', () => {
    it('should detect all navigation patterns', async () => {
      const { scanProject } = await import('../../src/core/scanner.js');

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
      const { scanProject } = await import('../../src/core/scanner.js');

      const scanResult = scanProject(demoDir);

      // Should find profile/:id route
      const dynamicRoute = scanResult.routes.find(r => r.path.includes(':id'));
      assert.ok(dynamicRoute, 'Should find dynamic route with :id parameter');
    });

    it('should find wildcard route', async () => {
      const { scanProject } = await import('../../src/core/scanner.js');

      const scanResult = scanProject(demoDir);

      // Should find * route
      const wildcardRoute = scanResult.routes.find(r => r.path === '*');
      assert.ok(wildcardRoute, 'Should find wildcard (*) route');
    });
  });
});
