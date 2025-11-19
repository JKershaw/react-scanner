/**
 * Server API tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../../src/server/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const demoDir = path.join(projectRoot, 'demo');

// Helper to make requests to the app
async function request(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url,
      query: {},
      params: {},
      body: body || {},
    };

    // Parse query string
    if (url.includes('?')) {
      const [pathPart, queryString] = url.split('?');
      req.url = pathPart;
      const params = new URLSearchParams(queryString);
      for (const [key, value] of params) {
        req.query[key] = value;
      }
    }

    // Parse path params
    const pathParts = req.url.split('/');
    if (pathParts.length > 3 && pathParts[2] === 'projects' && pathParts[3]) {
      req.params.id = pathParts[3];
    }

    const res = {
      statusCode: 200,
      _data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this._data = data;
        resolve({ status: this.statusCode, data });
      },
    };

    // Find matching route handler
    const routes = app._router.stack.filter(layer => layer.route);

    for (const layer of routes) {
      const route = layer.route;
      if (route.methods[method.toLowerCase()]) {
        const routePath = route.path;
        const urlPath = req.url;

        if (routePath === urlPath ||
            (routePath.includes(':') && urlPath.startsWith(routePath.split(':')[0]))) {
          try {
            const handler = route.stack[0].handle;
            const result = handler(req, res);
            // Handle async handlers
            if (result && typeof result.catch === 'function') {
              result.catch(reject);
            }
          } catch (error) {
            reject(error);
          }
          return;
        }
      }
    }

    resolve({ status: 404, data: { error: 'Not found' } });
  });
}

describe('Server API', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request('GET', '/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'ok');
      assert.ok(res.data.timestamp);
    });
  });

  describe('GET /api/projects', () => {
    it('should list projects in directory', async () => {
      const res = await request('GET', `/api/projects?root=${projectRoot}`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.projects));
    });
  });

  describe('POST /api/projects/scan', () => {
    it('should return error when projectPath is missing', async () => {
      const res = await request('POST', '/api/projects/scan', {});
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'projectPath is required');
    });

    it('should return error for invalid project', async () => {
      const res = await request('POST', '/api/projects/scan', {
        projectPath: '/tmp/nonexistent',
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.error.includes('Invalid'));
    });

    it('should scan demo project successfully', async () => {
      const res = await request('POST', '/api/projects/scan', {
        projectPath: demoDir,
      });
      assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}: ${JSON.stringify(res.data)}`);
      assert.ok(res.data.projectPath, 'Should have projectPath');
      assert.ok(res.data.graph, 'Should have graph');
      assert.ok(res.data.graph.nodes, 'Should have graph.nodes');
      assert.ok(res.data.graph.edges, 'Should have graph.edges');
    });

    it('should scan main project successfully', async () => {
      const res = await request('POST', '/api/projects/scan', {
        projectPath: projectRoot,
      });
      assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}: ${JSON.stringify(res.data)}`);
      assert.ok(res.data.projectPath, 'Should have projectPath');
      assert.ok(res.data.graph, 'Should have graph');
    });

    it('should return graph with correct structure', async () => {
      const res = await request('POST', '/api/projects/scan', {
        projectPath: demoDir,
      });
      assert.strictEqual(res.status, 200);

      // Check nodes structure
      const nodes = res.data.graph.nodes;
      assert.ok(typeof nodes === 'object', 'Nodes should be an object');
      assert.ok(Object.keys(nodes).length >= 6, `Should have at least 6 nodes, got ${Object.keys(nodes).length}`);

      // Check edges structure
      const edges = res.data.graph.edges;
      assert.ok(Array.isArray(edges), 'Edges should be an array');
      assert.ok(edges.length > 0, 'Should have at least one edge');

      // Check edge properties
      const firstEdge = edges[0];
      assert.ok(firstEdge.from, 'Edge should have from property');
      assert.ok(firstEdge.to, 'Edge should have to property');
    });
  });

  describe('POST /api/projects/validate', () => {
    it('should return error when projectPath is missing', async () => {
      const res = await request('POST', '/api/projects/validate', {});
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'projectPath is required');
    });

    it('should validate React project as valid', async () => {
      const res = await request('POST', '/api/projects/validate', {
        projectPath: projectRoot,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.valid, true);
    });

    it('should validate demo project as valid', async () => {
      const res = await request('POST', '/api/projects/validate', {
        projectPath: demoDir,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.valid, true);
    });

    it('should reject non-React project', async () => {
      const res = await request('POST', '/api/projects/validate', {
        projectPath: '/tmp',
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.valid, false);
    });
  });

  describe('GET /api/cache/stats', () => {
    it('should return cache statistics', async () => {
      const res = await request('GET', '/api/cache/stats');
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.data.size === 'number');
      assert.ok(Array.isArray(res.data.keys));
    });
  });

  describe('DELETE /api/cache', () => {
    it('should clear cache', async () => {
      const res = await request('DELETE', '/api/cache', {});
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
    });
  });
});
