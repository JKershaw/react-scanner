/**
 * File system utilities tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  validateProject,
  listProjects,
  scanProjectFiles,
  findSourceDirectory,
  clearCache,
  getCacheStats,
} from '../../src/server/file-system.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..', '..');
const demoDir = path.join(projectRoot, 'demo');
const tempDir = path.join(projectRoot, 'test-temp');

describe('File System', () => {
  beforeEach(() => {
    clearCache();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateProject', () => {
    it('should return true for valid React project', () => {
      const result = validateProject(projectRoot);
      assert.strictEqual(result, true);
    });

    it('should return true for demo project', () => {
      const result = validateProject(demoDir);
      assert.strictEqual(result, true);
    });

    it('should return false for non-existent directory', () => {
      const result = validateProject('/non/existent/path');
      assert.strictEqual(result, false);
    });

    it('should return false for directory without package.json', () => {
      const result = validateProject(tempDir);
      assert.strictEqual(result, false);
    });

    it('should return false for non-React project', () => {
      // Create a package.json without React
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', dependencies: { lodash: '1.0.0' } })
      );
      const result = validateProject(tempDir);
      assert.strictEqual(result, false);
    });
  });

  describe('listProjects', () => {
    it('should find React projects in directory', () => {
      const projects = listProjects(projectRoot, 1);
      assert.ok(Array.isArray(projects));
      // Should find at least the main project
      assert.ok(projects.length >= 1);
    });

    it('should return project name and path', () => {
      const projects = listProjects(projectRoot, 1);
      const mainProject = projects.find(p => p.path === projectRoot);
      assert.ok(mainProject);
      assert.strictEqual(mainProject.name, 'react-flowchart-generator');
    });

    it('should return empty array for non-existent directory', () => {
      const projects = listProjects('/non/existent', 1);
      assert.deepStrictEqual(projects, []);
    });

    it('should respect maxDepth parameter', () => {
      const projects = listProjects(projectRoot, 0);
      // With depth 0, should only check root directory
      assert.ok(projects.length <= 1);
    });
  });

  describe('scanProjectFiles', () => {
    it('should scan demo project successfully', () => {
      const result = scanProjectFiles(demoDir);
      assert.ok(result);
      assert.strictEqual(result.projectPath, demoDir);
      assert.ok(result.graph);
      assert.ok(result.graph.nodes);
      assert.ok(result.graph.edges);
    });

    it('should include scan statistics', () => {
      const result = scanProjectFiles(demoDir);
      assert.ok(result.scanResult);
      assert.ok(result.scanResult.routeCount >= 6);
      assert.ok(result.scanResult.linkCount > 0);
    });

    it('should cache results', () => {
      const result1 = scanProjectFiles(demoDir);
      const result2 = scanProjectFiles(demoDir, true);
      // Should return same cached result
      assert.deepStrictEqual(result1, result2);
    });

    it('should bypass cache when requested', () => {
      scanProjectFiles(demoDir);
      const stats1 = getCacheStats();
      assert.strictEqual(stats1.size, 1);

      // Force fresh scan
      scanProjectFiles(demoDir, false);
      // Cache should still have entry but with updated timestamp
      const stats2 = getCacheStats();
      assert.strictEqual(stats2.size, 1);
    });

    it('should throw for invalid project', () => {
      assert.throws(() => {
        scanProjectFiles(tempDir);
      });
    });
  });

  describe('findSourceDirectory', () => {
    it('should find src directory', () => {
      const srcDir = findSourceDirectory(demoDir);
      assert.ok(srcDir);
      assert.ok(srcDir.endsWith('src'));
    });

    it('should return null for empty directory', () => {
      const srcDir = findSourceDirectory(tempDir);
      assert.strictEqual(srcDir, null);
    });
  });

  describe('cache management', () => {
    it('should clear specific project cache', () => {
      scanProjectFiles(demoDir);
      assert.strictEqual(getCacheStats().size, 1);

      clearCache(demoDir);
      assert.strictEqual(getCacheStats().size, 0);
    });

    it('should clear all cache', () => {
      scanProjectFiles(demoDir);
      clearCache();
      assert.strictEqual(getCacheStats().size, 0);
    });

    it('should return cache statistics', () => {
      scanProjectFiles(demoDir);
      const stats = getCacheStats();
      assert.strictEqual(stats.size, 1);
      assert.ok(stats.keys.includes(demoDir));
    });
  });
});
