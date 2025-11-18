/**
 * Scanner module tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFile, findRoutes, findLinks, scanDirectory, scanProject } from '../src/scanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('Scanner', () => {
  describe('parseFile', () => {
    it('should parse a valid JSX file', () => {
      const filePath = path.join(fixturesDir, 'simple-route.jsx');
      const ast = parseFile(filePath);
      assert.ok(ast);
      assert.strictEqual(ast.type, 'File');
    });

    it('should return null for non-existent file', () => {
      const ast = parseFile('/non/existent/file.jsx');
      assert.strictEqual(ast, null);
    });
  });

  describe('findRoutes', () => {
    it('should extract a simple route definition', () => {
      const filePath = path.join(fixturesDir, 'simple-route.jsx');
      const routes = findRoutes(filePath);
      assert.strictEqual(routes.length, 1);
      assert.strictEqual(routes[0].path, '/');
      assert.strictEqual(routes[0].component, 'Home');
    });

    it('should extract dynamic route with parameters', () => {
      const filePath = path.join(fixturesDir, 'dynamic-route.jsx');
      const routes = findRoutes(filePath);
      assert.strictEqual(routes.length, 1);
      assert.strictEqual(routes[0].path, '/user/:id');
      assert.strictEqual(routes[0].component, 'UserProfile');
    });

    it('should extract multiple nested routes', () => {
      const filePath = path.join(fixturesDir, 'nested-routes.jsx');
      const routes = findRoutes(filePath);
      assert.strictEqual(routes.length, 3);
      assert.ok(routes.some(r => r.path === '/dashboard'));
      assert.ok(routes.some(r => r.path === '/dashboard/profile'));
      assert.ok(routes.some(r => r.path === '/dashboard/settings'));
    });

    it('should return empty array for non-existent file', () => {
      const routes = findRoutes('/non/existent/file.jsx');
      assert.strictEqual(routes.length, 0);
    });
  });

  describe('findLinks', () => {
    it('should extract Link components', () => {
      const filePath = path.join(fixturesDir, 'multiple-links.jsx');
      const links = findLinks(filePath);
      assert.strictEqual(links.length, 3);
      assert.ok(links.some(l => l.to === '/about' && l.type === 'Link'));
      assert.ok(links.some(l => l.to === '/contact' && l.type === 'Link'));
      assert.ok(links.some(l => l.to === '/dashboard' && l.type === 'NavLink'));
    });

    it('should extract navigate() calls', () => {
      const filePath = path.join(fixturesDir, 'navigate-call.jsx');
      const links = findLinks(filePath);
      assert.strictEqual(links.length, 2);
      assert.ok(links.some(l => l.to === '/' && l.type === 'navigate'));
      assert.ok(links.some(l => l.to === '/profile' && l.type === 'navigate'));
    });

    it('should handle template literals in to prop', () => {
      const filePath = path.join(fixturesDir, 'template-literal.jsx');
      const links = findLinks(filePath);
      assert.strictEqual(links.length, 1);
      assert.strictEqual(links[0].to, '/users');
    });

    it('should include fromFile in link data', () => {
      const filePath = path.join(fixturesDir, 'multiple-links.jsx');
      const links = findLinks(filePath);
      assert.ok(links.every(l => l.fromFile === 'multiple-links.jsx'));
    });

    it('should return empty array for non-existent file', () => {
      const links = findLinks('/non/existent/file.jsx');
      assert.strictEqual(links.length, 0);
    });

    it('should extract button onClick handlers with navigate', () => {
      const filePath = path.join(fixturesDir, 'button-click.jsx');
      const links = findLinks(filePath);
      assert.strictEqual(links.length, 2);
      assert.ok(links.some(l => l.to === '/dashboard' && l.type === 'button'));
      assert.ok(links.some(l => l.to === '/profile' && l.type === 'button'));
      assert.ok(links.every(l => l.action === 'clicks button'));
    });

    it('should extract form onSubmit handlers with navigate', () => {
      const filePath = path.join(fixturesDir, 'form-submit.jsx');
      const links = findLinks(filePath);
      // May find both form handler and standalone navigate - filter for form type
      const formLinks = links.filter(l => l.type === 'form');
      assert.strictEqual(formLinks.length, 1);
      assert.strictEqual(formLinks[0].to, '/success');
      assert.strictEqual(formLinks[0].action, 'submits form');
    });

    it('should include action field in link data', () => {
      const filePath = path.join(fixturesDir, 'multiple-links.jsx');
      const links = findLinks(filePath);
      assert.ok(links.every(l => l.action === 'clicks link'));
    });
  });

  describe('scanDirectory', () => {
    it('should find all React files in directory', () => {
      const files = scanDirectory(fixturesDir);
      assert.ok(files.length > 0);
      assert.ok(files.every(f => /\.(jsx?|tsx?)$/.test(f)));
    });

    it('should return empty array for non-existent directory', () => {
      const files = scanDirectory('/non/existent/dir');
      assert.strictEqual(files.length, 0);
    });
  });

  describe('scanProject', () => {
    it('should aggregate routes and links from all files', () => {
      const result = scanProject(fixturesDir);
      assert.ok(result.routes.length > 0);
      assert.ok(result.links.length > 0);
      assert.ok(result.files.length > 0);
    });

    it('should include file path in route data', () => {
      const result = scanProject(fixturesDir);
      assert.ok(result.routes.every(r => r.file));
    });

    it('should include file path in link data', () => {
      const result = scanProject(fixturesDir);
      assert.ok(result.links.every(l => l.file));
    });
  });
});
