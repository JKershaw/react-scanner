#!/usr/bin/env node

/**
 * Start both API and Vite servers for development/testing
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Start API server
const api = spawn('node', ['src/server/index.js'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

// Start Vite
const vite = spawn('npx', ['vite', '--port', '3000'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

// Handle shutdown
process.on('SIGINT', () => {
  api.kill();
  vite.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  api.kill();
  vite.kill();
  process.exit();
});
