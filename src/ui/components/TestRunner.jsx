import React, { useState } from 'react';
import { useStore } from '../App.jsx';

function TestRunner() {
  const { selectedPath, graph } = useStore();
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [result, setResult] = useState(null);

  const handleRunTest = async () => {
    if (!selectedPath || !graph) return;

    setIsRunning(true);
    setOutput('Starting test execution...\n');
    setResult(null);

    try {
      // Generate test code
      const testCode = generatePlaywrightTest(selectedPath, graph);

      // Send to server for execution
      const response = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCode }),
      });

      if (!response.ok) {
        throw new Error('Test execution failed');
      }

      const data = await response.json();
      setOutput(data.output || 'Test completed');
      setResult({
        passed: data.passed,
        failed: data.failed,
        duration: data.duration,
      });
    } catch (error) {
      setOutput(`Error: ${error.message}`);
      setResult({ passed: 0, failed: 1, error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  // Generate Playwright test code
  function generatePlaywrightTest(path, graph) {
    const steps = path.map((nodeId) => {
      const node = graph.nodes[nodeId];
      return `  await page.goto('${node.path}');`;
    });

    return `
import { test, expect } from '@playwright/test';

test('Navigation test', async ({ page }) => {
${steps.join('\n')}
});`;
  }

  if (!selectedPath) {
    return null;
  }

  return (
    <div className="test-runner">
      <h3>Test Runner</h3>

      <button
        className="btn-primary"
        onClick={handleRunTest}
        disabled={isRunning}
      >
        {isRunning ? 'Running...' : 'Run Test'}
      </button>

      {output && (
        <div className="test-output">
          <pre>{output}</pre>
        </div>
      )}

      {result && (
        <div className={`test-result ${result.failed > 0 ? 'failed' : 'passed'}`}>
          {result.failed > 0 ? (
            <span>Failed: {result.failed} test(s)</span>
          ) : (
            <span>Passed: {result.passed} test(s)</span>
          )}
          {result.duration && <span> ({result.duration}ms)</span>}
        </div>
      )}
    </div>
  );
}

export default TestRunner;
