/**
 * Graph builder module tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  inferSourcePath,
  sanitizeId,
  createNodeLabel,
  getNodeType,
  buildGraph,
  validateGraph
} from '../src/graph.js';

describe('Graph', () => {
  describe('inferSourcePath', () => {
    const routes = [
      { path: '/', component: 'Home' },
      { path: '/about', component: 'About' },
      { path: '/dashboard', component: 'Dashboard' },
      { path: '*', component: 'NotFound' },
    ];

    it('should match exact component name', () => {
      const result = inferSourcePath('Home.jsx', routes);
      assert.strictEqual(result, '/');
    });

    it('should match component to route path', () => {
      const result = inferSourcePath('Dashboard.jsx', routes);
      assert.strictEqual(result, '/dashboard');
    });

    it('should handle NotFound special case', () => {
      const result = inferSourcePath('NotFound.jsx', routes);
      assert.strictEqual(result, '*');
    });

    it('should return null for unmatched file', () => {
      const result = inferSourcePath('Unknown.jsx', routes);
      assert.strictEqual(result, null);
    });

    it('should handle Home/Index for root route', () => {
      const result = inferSourcePath('Index.jsx', routes);
      assert.strictEqual(result, '/');
    });
  });

  describe('sanitizeId', () => {
    it('should remove leading slash', () => {
      assert.strictEqual(sanitizeId('/about'), 'about');
    });

    it('should replace slashes with underscores', () => {
      assert.strictEqual(sanitizeId('/dashboard/settings'), 'dashboard_settings');
    });

    it('should replace colons with param_', () => {
      assert.strictEqual(sanitizeId('/user/:id'), 'user_param_id');
    });

    it('should handle root path', () => {
      assert.strictEqual(sanitizeId('/'), 'root');
    });

    it('should handle wildcard', () => {
      assert.strictEqual(sanitizeId('*'), 'wildcard');
    });

    it('should remove special characters', () => {
      assert.strictEqual(sanitizeId('/path?query'), 'path_q_query');
    });
  });

  describe('createNodeLabel', () => {
    it('should format root path label', () => {
      const label = createNodeLabel('/', 'Home');
      assert.strictEqual(label, '/ (Home)');
    });

    it('should format regular path label', () => {
      const label = createNodeLabel('/about', 'About');
      assert.strictEqual(label, '/about\\n(About)');
    });
  });

  describe('getNodeType', () => {
    it('should identify error pages', () => {
      assert.strictEqual(getNodeType('*', 'NotFound'), 'error');
      assert.strictEqual(getNodeType('/error', 'ErrorPage'), 'error');
    });

    it('should identify auth pages', () => {
      assert.strictEqual(getNodeType('/login', 'Login'), 'auth');
      assert.strictEqual(getNodeType('/signup', 'Signup'), 'auth');
    });

    it('should identify dashboard pages', () => {
      assert.strictEqual(getNodeType('/dashboard', 'Dashboard'), 'dashboard');
      assert.strictEqual(getNodeType('/admin', 'Admin'), 'dashboard');
    });

    it('should default to page type', () => {
      assert.strictEqual(getNodeType('/about', 'About'), 'page');
    });
  });

  describe('buildGraph', () => {
    it('should create nodes from routes', () => {
      const scanResult = {
        routes: [
          { path: '/', component: 'Home', file: 'routes.jsx' },
          { path: '/about', component: 'About', file: 'routes.jsx' },
        ],
        links: [],
      };

      const graph = buildGraph(scanResult);
      assert.strictEqual(graph.nodes.size, 2);
      assert.ok(graph.nodes.has('root'));
      assert.ok(graph.nodes.has('about'));
    });

    it('should create edges from links', () => {
      const scanResult = {
        routes: [
          { path: '/', component: 'Home', file: 'routes.jsx' },
          { path: '/about', component: 'About', file: 'routes.jsx' },
        ],
        links: [
          { to: '/about', fromFile: 'Home.jsx', type: 'Link', file: 'Home.jsx' },
        ],
      };

      const graph = buildGraph(scanResult);
      assert.strictEqual(graph.edges.length, 1);
      assert.strictEqual(graph.edges[0].from, 'root');
      assert.strictEqual(graph.edges[0].to, 'about');
    });

    it('should handle empty input', () => {
      const graph = buildGraph({ routes: [], links: [] });
      assert.strictEqual(graph.nodes.size, 0);
      assert.strictEqual(graph.edges.length, 0);
    });

    it('should deduplicate edges', () => {
      const scanResult = {
        routes: [
          { path: '/', component: 'Home', file: 'routes.jsx' },
          { path: '/about', component: 'About', file: 'routes.jsx' },
        ],
        links: [
          { to: '/about', fromFile: 'Home.jsx', type: 'Link', file: 'Home.jsx' },
          { to: '/about', fromFile: 'Home.jsx', type: 'NavLink', file: 'Home.jsx' },
        ],
      };

      const graph = buildGraph(scanResult);
      assert.strictEqual(graph.edges.length, 1);
    });
  });

  describe('validateGraph', () => {
    it('should return empty warnings for valid graph', () => {
      const graph = {
        nodes: new Map([
          ['root', { id: 'root', component: 'Home' }],
          ['about', { id: 'about', component: 'About' }],
        ]),
        edges: [{ from: 'root', to: 'about' }],
      };

      const warnings = validateGraph(graph);
      assert.strictEqual(warnings.length, 0);
    });

    it('should warn about isolated nodes', () => {
      const graph = {
        nodes: new Map([
          ['root', { id: 'root', component: 'Home' }],
          ['about', { id: 'about', component: 'About' }],
          ['isolated', { id: 'isolated', component: 'Isolated' }],
        ]),
        edges: [{ from: 'root', to: 'about' }],
      };

      const warnings = validateGraph(graph);
      assert.ok(warnings.some(w => w.includes('isolated')));
    });
  });
});
