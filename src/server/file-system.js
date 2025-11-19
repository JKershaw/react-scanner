/**
 * File system utilities for project management
 */

import fs from 'fs';
import path from 'path';
import { scanProject } from '../core/scanner.js';
import { buildGraph } from '../core/graph.js';

// In-memory cache for scan results
const scanCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validate if a directory is a React project
 * @param {string} projectPath - Path to validate
 * @returns {boolean} - True if valid React project
 */
export function validateProject(projectPath) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return 'react' in deps || 'react-dom' in deps;
  } catch (error) {
    return false;
  }
}

/**
 * List all valid React projects in a directory
 * @param {string} rootDir - Root directory to search
 * @param {number} maxDepth - Maximum directory depth to search
 * @returns {Array<{path: string, name: string}>} - Array of project info
 */
export function listProjects(rootDir, maxDepth = 2) {
  const projects = [];

  function searchDir(dir, depth) {
    if (depth > maxDepth) return;

    try {
      // Check if current directory is a React project
      if (validateProject(dir)) {
        const packageJson = JSON.parse(
          fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')
        );
        projects.push({
          path: dir,
          name: packageJson.name || path.basename(dir),
        });
        return; // Don't search subdirectories of a project
      }

      // Search subdirectories
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          searchDir(path.join(dir, entry.name), depth + 1);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  searchDir(rootDir, 0);
  return projects;
}

/**
 * Scan a project and return graph data
 * @param {string} projectPath - Path to project
 * @param {boolean} useCache - Whether to use cached results
 * @returns {Object} - Scan result with graph data
 */
export function scanProjectFiles(projectPath, useCache = true) {
  // Check cache
  if (useCache && scanCache.has(projectPath)) {
    const cached = scanCache.get(projectPath);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    scanCache.delete(projectPath);
  }

  // Find source directory
  const srcDir = findSourceDirectory(projectPath);
  if (!srcDir) {
    throw new Error(`Could not find source directory in ${projectPath}`);
  }

  // Scan project
  const scanResult = scanProject(srcDir);
  const graph = buildGraph(scanResult);

  // Convert Map to object for JSON serialization
  const nodesObj = {};
  for (const [key, value] of graph.nodes) {
    nodesObj[key] = value;
  }

  const result = {
    projectPath,
    srcDir,
    scanResult: {
      files: scanResult.files,
      routeCount: scanResult.routes.length,
      linkCount: scanResult.links.length,
      componentCount: scanResult.components ? scanResult.components.length : 0,
    },
    graph: {
      nodes: nodesObj,
      edges: graph.edges,
    },
  };

  // Cache result
  scanCache.set(projectPath, {
    timestamp: Date.now(),
    data: result,
  });

  return result;
}

/**
 * Find source directory in a project
 * @param {string} projectPath - Project root path
 * @returns {string|null} - Source directory path or null
 */
export function findSourceDirectory(projectPath) {
  const possibleDirs = ['src', 'app', 'pages', 'lib', '.'];

  for (const dir of possibleDirs) {
    const fullPath = path.join(projectPath, dir);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      // Check if directory contains React files
      const files = fs.readdirSync(fullPath);
      const hasReactFiles = files.some(f =>
        f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('.js')
      );
      if (hasReactFiles || dir === 'src') {
        return fullPath;
      }
    }
  }

  return null;
}

/**
 * Clear cache for a specific project or all
 * @param {string} projectPath - Optional project path to clear
 */
export function clearCache(projectPath = null) {
  if (projectPath) {
    scanCache.delete(projectPath);
  } else {
    scanCache.clear();
  }
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export function getCacheStats() {
  return {
    size: scanCache.size,
    keys: Array.from(scanCache.keys()),
  };
}
