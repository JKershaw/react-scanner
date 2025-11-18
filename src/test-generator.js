/**
 * Test Generator module - Find paths and generate test code
 */

/**
 * Find all paths between two nodes using BFS
 * @param {{nodes: Map, edges: Array}} graph - The graph
 * @param {string} startId - Start node ID
 * @param {string} endId - End node ID
 * @param {number} maxPaths - Maximum number of paths to find
 * @param {number} maxLength - Maximum path length
 * @returns {Array<Array<string>>} - Array of paths (each path is array of node IDs)
 */
export function findAllPaths(graph, startId, endId, maxPaths = 10, maxLength = 10) {
  const { nodes, edges } = graph;

  if (!nodes.has(startId) || !nodes.has(endId)) {
    return [];
  }

  const paths = [];
  const queue = [[startId]];

  while (queue.length > 0 && paths.length < maxPaths) {
    const currentPath = queue.shift();
    const currentNode = currentPath[currentPath.length - 1];

    if (currentNode === endId) {
      paths.push(currentPath);
      continue;
    }

    if (currentPath.length >= maxLength) {
      continue;
    }

    // Find outgoing edges from current node
    const outgoingEdges = edges.filter(e => e.from === currentNode);

    for (const edge of outgoingEdges) {
      // Avoid cycles (don't revisit nodes in current path)
      if (!currentPath.includes(edge.to)) {
        queue.push([...currentPath, edge.to]);
      }
    }
  }

  // Sort paths by length (shortest first)
  paths.sort((a, b) => a.length - b.length);

  return paths;
}

/**
 * Get edge between two nodes
 * @param {Array} edges - Graph edges
 * @param {string} fromId - Source node ID
 * @param {string} toId - Target node ID
 * @returns {Object|null} - Edge or null
 */
export function getEdge(edges, fromId, toId) {
  return edges.find(e => e.from === fromId && e.to === toId) || null;
}

/**
 * Build test case from a path
 * @param {Array<string>} path - Array of node IDs
 * @param {{nodes: Object, edges: Array}} graph - Graph data (with nodes as object, not Map)
 * @returns {Object} - Test case data structure
 */
export function buildTestCase(path, graph) {
  const { nodes, edges } = graph;

  const steps = [];
  let testName = '';

  for (let i = 0; i < path.length; i++) {
    const nodeId = path[i];
    const node = nodes[nodeId];

    if (!node) continue;

    if (i === 0) {
      // First step - navigate to start
      steps.push({
        action: 'navigate',
        target: node.path,
        description: `Navigate to ${node.path}`
      });
      testName = node.component;
    } else {
      // Subsequent steps - follow edge
      const prevNodeId = path[i - 1];
      const edge = getEdge(edges, prevNodeId, nodeId);

      if (edge) {
        steps.push({
          action: edge.type === 'form' ? 'submit' : 'click',
          target: node.path,
          actionType: edge.action || 'navigates to',
          description: `${edge.action || 'Navigate to'} ${node.path}`
        });
      }

      // Add URL assertion
      steps.push({
        action: 'assert',
        type: 'url',
        expected: node.path,
        description: `Verify URL is ${node.path}`
      });
    }

    if (i === path.length - 1) {
      testName += ` to ${node.component}`;
    }
  }

  return {
    id: path.join('-'),
    name: testName,
    path: path.map(id => nodes[id]?.path || id),
    steps,
    nodeIds: path
  };
}

/**
 * Generate Playwright test code from test case
 * @param {Object} testCase - Test case data structure
 * @param {Object} options - Generation options
 * @returns {string} - Playwright test code
 */
export function generatePlaywrightTest(testCase, options = {}) {
  const {
    baseUrl = 'http://localhost:3000',
    timeout = 30000
  } = options;

  const lines = [];

  // Import
  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push('');

  // Test block
  lines.push(`test('${testCase.name}', async ({ page }) => {`);
  lines.push(`  test.setTimeout(${timeout});`);
  lines.push('');

  for (const step of testCase.steps) {
    switch (step.action) {
      case 'navigate':
        lines.push(`  // ${step.description}`);
        lines.push(`  await page.goto('${baseUrl}${step.target}');`);
        lines.push('');
        break;

      case 'click':
        lines.push(`  // ${step.description}`);
        // Generate a reasonable selector - in real app would need better detection
        lines.push(`  await page.click('a[href="${step.target}"], [data-testid="${step.target.replace(/\//g, '-').substring(1)}"]');`);
        lines.push('');
        break;

      case 'submit':
        lines.push(`  // ${step.description}`);
        lines.push(`  await page.click('button[type="submit"], [data-testid="submit"]');`);
        lines.push('');
        break;

      case 'assert':
        if (step.type === 'url') {
          lines.push(`  // ${step.description}`);
          lines.push(`  await expect(page).toHaveURL(new RegExp('${step.expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'));`);
          lines.push('');
        }
        break;
    }
  }

  lines.push('});');

  return lines.join('\n');
}

/**
 * Generate Cypress test code from test case
 * @param {Object} testCase - Test case data structure
 * @param {Object} options - Generation options
 * @returns {string} - Cypress test code
 */
export function generateCypressTest(testCase, options = {}) {
  const {
    baseUrl = 'http://localhost:3000'
  } = options;

  const lines = [];

  // Test block
  lines.push(`describe('${testCase.name}', () => {`);
  lines.push(`  it('should complete the journey', () => {`);

  for (const step of testCase.steps) {
    switch (step.action) {
      case 'navigate':
        lines.push(`    // ${step.description}`);
        lines.push(`    cy.visit('${step.target}');`);
        lines.push('');
        break;

      case 'click':
        lines.push(`    // ${step.description}`);
        lines.push(`    cy.get('a[href="${step.target}"], [data-testid="${step.target.replace(/\//g, '-').substring(1)}"]').click();`);
        lines.push('');
        break;

      case 'submit':
        lines.push(`    // ${step.description}`);
        lines.push(`    cy.get('button[type="submit"], [data-testid="submit"]').click();`);
        lines.push('');
        break;

      case 'assert':
        if (step.type === 'url') {
          lines.push(`    // ${step.description}`);
          lines.push(`    cy.url().should('include', '${step.expected}');`);
          lines.push('');
        }
        break;
    }
  }

  lines.push('  });');
  lines.push('});');

  return lines.join('\n');
}

/**
 * Generate multiple test cases from all paths between two nodes
 * @param {{nodes: Object, edges: Array}} graph - Graph data
 * @param {string} startId - Start node ID
 * @param {string} endId - End node ID
 * @param {Object} options - Options
 * @returns {Array<Object>} - Array of test cases
 */
export function generateTestCases(graph, startId, endId, options = {}) {
  const { maxPaths = 5, maxLength = 8 } = options;

  // Convert nodes Map to object if needed
  const graphData = {
    nodes: graph.nodes instanceof Map
      ? Object.fromEntries(graph.nodes)
      : graph.nodes,
    edges: graph.edges
  };

  const paths = findAllPaths(
    { nodes: new Map(Object.entries(graphData.nodes)), edges: graphData.edges },
    startId,
    endId,
    maxPaths,
    maxLength
  );

  return paths.map(path => buildTestCase(path, graphData));
}
