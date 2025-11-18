/**
 * Express server for React Flowchart Generator
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  listProjects,
  scanProjectFiles,
  validateProject,
  clearCache,
  getCacheStats,
} from './file-system.js';
import { runTest } from './test-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../../public')));

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/projects
 * List available React projects in a directory
 */
app.get('/api/projects', (req, res) => {
  try {
    const rootDir = req.query.root || process.cwd();
    const maxDepth = parseInt(req.query.maxDepth) || 2;

    const projects = listProjects(rootDir, maxDepth);
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/scan
 * Scan a specific project
 */
app.post('/api/projects/scan', (req, res) => {
  try {
    const { projectPath, useCache = true } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    // Validate project
    if (!validateProject(projectPath)) {
      return res.status(400).json({
        error: 'Invalid React project',
        details: 'No package.json with React dependency found',
      });
    }

    const result = scanProjectFiles(projectPath, useCache);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id
 * Get cached scan results for a project
 */
app.get('/api/projects/:id', (req, res) => {
  try {
    const projectPath = decodeURIComponent(req.params.id);
    const result = scanProjectFiles(projectPath, true);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/validate
 * Validate if a path is a React project
 */
app.post('/api/projects/validate', (req, res) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    const isValid = validateProject(projectPath);
    res.json({ valid: isValid, path: projectPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/cache
 * Clear scan cache
 */
app.delete('/api/cache', (req, res) => {
  try {
    const { projectPath } = req.body || {};
    clearCache(projectPath);
    res.json({ success: true, cleared: projectPath || 'all' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
app.get('/api/cache/stats', (req, res) => {
  try {
    const stats = getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tests/run
 * Run a test
 */
app.post('/api/tests/run', async (req, res) => {
  try {
    const { testCode } = req.body;

    if (!testCode) {
      return res.status(400).json({ error: 'testCode is required' });
    }

    const result = await runTest(testCode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API endpoints:');
    console.log('  GET  /api/health');
    console.log('  GET  /api/projects');
    console.log('  POST /api/projects/scan');
    console.log('  GET  /api/projects/:id');
    console.log('  POST /api/projects/validate');
    console.log('  DELETE /api/cache');
    console.log('  GET  /api/cache/stats');
  });
}

export { app };
