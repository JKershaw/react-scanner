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
  validateGraph,
  buildImportGraph,
  findSourcePaths
} from '../../src/core/graph.js';

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

  describe('buildImportGraph', () => {
    it('should map component names to importing files', () => {
      const imports = [
        { imported: 'Sidebar', source: './Sidebar', fromFile: 'Home.jsx' },
        { imported: 'Sidebar', source: './Sidebar', fromFile: 'About.jsx' },
      ];
      const routes = [];

      const importGraph = buildImportGraph(imports, routes);
      assert.ok(importGraph.has('Sidebar'));
      assert.deepStrictEqual(importGraph.get('Sidebar'), ['Home.jsx', 'About.jsx']);
    });

    it('should handle named imports', () => {
      const imports = [
        { imported: 'NavMenu', source: './components', fromFile: 'Dashboard.jsx' },
        { imported: 'Footer', source: './components', fromFile: 'Dashboard.jsx' },
      ];
      const routes = [];

      const importGraph = buildImportGraph(imports, routes);
      assert.ok(importGraph.has('NavMenu'));
      assert.ok(importGraph.has('Footer'));
    });

    it('should return empty map for no imports', () => {
      const importGraph = buildImportGraph([], []);
      assert.strictEqual(importGraph.size, 0);
    });
  });

  describe('findSourcePaths', () => {
    const routes = [
      { path: '/', component: 'Home' },
      { path: '/settings/profile', component: 'SettingsProfile' },
      { path: '/settings/security', component: 'SettingsSecurity' },
      { path: '/dashboard', component: 'Dashboard' },
    ];

    it('should return direct match for page component', () => {
      const importGraph = new Map();
      const paths = findSourcePaths('Home.jsx', routes, importGraph);
      assert.deepStrictEqual(paths, ['/']);
    });

    it('should return all importing pages for shared component', () => {
      const importGraph = new Map([
        ['Sidebar', ['SettingsProfile.jsx', 'SettingsSecurity.jsx']],
      ]);
      const paths = findSourcePaths('Sidebar.jsx', routes, importGraph);
      assert.strictEqual(paths.length, 2);
      assert.ok(paths.includes('/settings/profile'));
      assert.ok(paths.includes('/settings/security'));
    });

    it('should handle nested imports (component imported by another shared component)', () => {
      const importGraph = new Map([
        ['Icon', ['Sidebar.jsx']],
        ['Sidebar', ['SettingsProfile.jsx']],
      ]);
      const paths = findSourcePaths('Icon.jsx', routes, importGraph);
      assert.strictEqual(paths.length, 1);
      assert.ok(paths.includes('/settings/profile'));
    });

    it('should return empty array for unmatched component', () => {
      const importGraph = new Map();
      const paths = findSourcePaths('Unknown.jsx', routes, importGraph);
      assert.deepStrictEqual(paths, []);
    });

    it('should deduplicate paths', () => {
      const importGraph = new Map([
        ['Sidebar', ['SettingsProfile.jsx', 'SettingsProfile.jsx']],
      ]);
      const paths = findSourcePaths('Sidebar.jsx', routes, importGraph);
      assert.strictEqual(paths.length, 1);
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

    it('should create edges from shared component links to all importing pages', () => {
      const scanResult = {
        routes: [
          { path: '/settings/profile', component: 'SettingsProfile', file: 'routes.jsx' },
          { path: '/settings/security', component: 'SettingsSecurity', file: 'routes.jsx' },
          { path: '/dashboard', component: 'Dashboard', file: 'routes.jsx' },
        ],
        links: [
          // Link in shared Sidebar component
          { to: '/dashboard', fromFile: 'Sidebar.jsx', type: 'Link', file: 'Sidebar.jsx' },
        ],
        imports: [
          { imported: 'Sidebar', source: './Sidebar', fromFile: 'SettingsProfile.jsx', file: 'SettingsProfile.jsx' },
          { imported: 'Sidebar', source: './Sidebar', fromFile: 'SettingsSecurity.jsx', file: 'SettingsSecurity.jsx' },
        ],
      };

      const graph = buildGraph(scanResult);
      // Should create edges from both settings pages to dashboard
      assert.strictEqual(graph.edges.length, 2);
      const edgeFromProfile = graph.edges.find(e => e.from === 'settings_profile');
      const edgeFromSecurity = graph.edges.find(e => e.from === 'settings_security');
      assert.ok(edgeFromProfile);
      assert.ok(edgeFromSecurity);
      assert.strictEqual(edgeFromProfile.to, 'dashboard');
      assert.strictEqual(edgeFromSecurity.to, 'dashboard');
    });

    it('should handle sidebar with multiple links', () => {
      const scanResult = {
        routes: [
          { path: '/settings/profile', component: 'SettingsProfile', file: 'routes.jsx' },
          { path: '/settings/security', component: 'SettingsSecurity', file: 'routes.jsx' },
        ],
        links: [
          // Links in shared Sidebar component
          { to: '/settings/profile', fromFile: 'Sidebar.jsx', type: 'Link', file: 'Sidebar.jsx' },
          { to: '/settings/security', fromFile: 'Sidebar.jsx', type: 'Link', file: 'Sidebar.jsx' },
        ],
        imports: [
          { imported: 'Sidebar', source: './Sidebar', fromFile: 'SettingsProfile.jsx', file: 'SettingsProfile.jsx' },
          { imported: 'Sidebar', source: './Sidebar', fromFile: 'SettingsSecurity.jsx', file: 'SettingsSecurity.jsx' },
        ],
      };

      const graph = buildGraph(scanResult);
      // Each page should have edges to both targets (but not to itself due to deduplication logic)
      // Profile -> Security (from sidebar)
      // Security -> Profile (from sidebar)
      const profileToSecurity = graph.edges.find(e => e.from === 'settings_profile' && e.to === 'settings_security');
      const securityToProfile = graph.edges.find(e => e.from === 'settings_security' && e.to === 'settings_profile');
      assert.ok(profileToSecurity);
      assert.ok(securityToProfile);
    });

    it('should work without imports (backward compatibility)', () => {
      const scanResult = {
        routes: [
          { path: '/', component: 'Home', file: 'routes.jsx' },
          { path: '/about', component: 'About', file: 'routes.jsx' },
        ],
        links: [
          { to: '/about', fromFile: 'Home.jsx', type: 'Link', file: 'Home.jsx' },
        ],
        // No imports field
      };

      const graph = buildGraph(scanResult);
      assert.strictEqual(graph.edges.length, 1);
      assert.strictEqual(graph.edges[0].from, 'root');
      assert.strictEqual(graph.edges[0].to, 'about');
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
