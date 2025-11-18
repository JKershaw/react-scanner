/**
 * Test runner for executing Playwright tests
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run a Playwright test
 * @param {string} testCode - The test code to execute
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Test results
 */
export async function runTest(testCode, options = {}) {
  const { timeout = 30000 } = options;

  // Create temporary test file
  const tempDir = path.join(__dirname, '../../.temp-tests');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const testFile = path.join(tempDir, `test-${Date.now()}.spec.js`);
  fs.writeFileSync(testFile, testCode);

  return new Promise((resolve) => {
    let output = '';
    let passed = 0;
    let failed = 0;

    const startTime = Date.now();

    // Run playwright test
    const proc = spawn('npx', ['playwright', 'test', testFile, '--reporter=line'], {
      cwd: path.join(__dirname, '../..'),
      timeout,
      shell: true,
    });

    proc.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;

      // Parse results
      if (str.includes('passed')) {
        const match = str.match(/(\d+) passed/);
        if (match) passed = parseInt(match[1]);
      }
      if (str.includes('failed')) {
        const match = str.match(/(\d+) failed/);
        if (match) failed = parseInt(match[1]);
      }
    });

    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(testFile);
      } catch (e) {
        // Ignore cleanup errors
      }

      const duration = Date.now() - startTime;

      resolve({
        success: code === 0,
        passed,
        failed: failed || (code !== 0 ? 1 : 0),
        output,
        duration,
      });
    });

    proc.on('error', (error) => {
      resolve({
        success: false,
        passed: 0,
        failed: 1,
        output: `Error: ${error.message}`,
        duration: Date.now() - startTime,
      });
    });
  });
}
