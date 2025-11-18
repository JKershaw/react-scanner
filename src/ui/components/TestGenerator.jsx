import React, { useState, useMemo } from 'react';
import { useStore } from '../App.jsx';

// Generate Playwright test code
function generatePlaywright(path, graph) {
  if (!path || path.length === 0) return '';

  const steps = path.map((nodeId) => {
    const node = graph.nodes[nodeId];
    return `  await page.goto('${node.path}');
  await expect(page).toHaveURL('${node.path}');`;
  });

  return `import { test, expect } from '@playwright/test';

test('Navigate from ${graph.nodes[path[0]].label} to ${graph.nodes[path[path.length - 1]].label}', async ({ page }) => {
${steps.join('\n\n')}
});`;
}

// Generate Cypress test code
function generateCypress(path, graph) {
  if (!path || path.length === 0) return '';

  const steps = path.map((nodeId) => {
    const node = graph.nodes[nodeId];
    return `    cy.visit('${node.path}');
    cy.url().should('include', '${node.path}');`;
  });

  return `describe('Navigation Test', () => {
  it('should navigate from ${graph.nodes[path[0]].label} to ${graph.nodes[path[path.length - 1]].label}', () => {
${steps.join('\n\n')}
  });
});`;
}

// Generate Gherkin feature
function generateGherkin(path, graph) {
  if (!path || path.length === 0) return '';

  const steps = [];
  for (let i = 0; i < path.length; i++) {
    const node = graph.nodes[path[i]];
    if (i === 0) {
      steps.push(`  Given I am on the "${node.label}" page`);
    } else {
      const prevNode = graph.nodes[path[i - 1]];
      const edge = graph.edges.find(
        (e) => e.from === path[i - 1] && e.to === path[i]
      );
      const action = edge?.action || 'navigates to';
      steps.push(`  When I ${action} "${node.label}"`);
      steps.push(`  Then I should be on the "${node.label}" page`);
    }
  }

  return `Feature: User Navigation Journey
  As a user
  I want to navigate through the application
  So that I can access different features

  Scenario: Navigate from ${graph.nodes[path[0]].label} to ${graph.nodes[path[path.length - 1]].label}
${steps.join('\n')}`;
}

function TestGenerator() {
  const { graph, selectedPath } = useStore();
  const [format, setFormat] = useState('playwright');
  const [copyStatus, setCopyStatus] = useState('');

  const generatedCode = useMemo(() => {
    if (!selectedPath || !graph) return '';

    switch (format) {
      case 'playwright':
        return generatePlaywright(selectedPath, graph);
      case 'cypress':
        return generateCypress(selectedPath, graph);
      case 'gherkin':
        return generateGherkin(selectedPath, graph);
      default:
        return '';
    }
  }, [selectedPath, graph, format]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      setCopyStatus('Failed to copy');
    }
  };

  const handleDownload = () => {
    const extensions = {
      playwright: '.spec.js',
      cypress: '.cy.js',
      gherkin: '.feature',
    };

    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test${extensions[format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!selectedPath) {
    return (
      <div className="test-generator">
        <h3>Test Generator</h3>
        <p className="hint">Select start and end nodes to generate test code</p>
      </div>
    );
  }

  return (
    <div className="test-generator">
      <h3>Test Generator</h3>

      <div className="format-selector">
        <button
          className={`format-btn ${format === 'playwright' ? 'active' : ''}`}
          onClick={() => setFormat('playwright')}
        >
          Playwright
        </button>
        <button
          className={`format-btn ${format === 'cypress' ? 'active' : ''}`}
          onClick={() => setFormat('cypress')}
        >
          Cypress
        </button>
        <button
          className={`format-btn ${format === 'gherkin' ? 'active' : ''}`}
          onClick={() => setFormat('gherkin')}
        >
          Gherkin
        </button>
      </div>

      <div className="code-container">
        <pre className="code-output">
          <code>{generatedCode}</code>
        </pre>
      </div>

      <div className="code-actions">
        <button className="btn-primary" onClick={handleCopy}>
          {copyStatus || 'Copy'}
        </button>
        <button className="btn-secondary" onClick={handleDownload}>
          Download
        </button>
      </div>
    </div>
  );
}

export default TestGenerator;
