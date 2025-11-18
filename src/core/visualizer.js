/**
 * Visualizer module - Generate Mermaid syntax and HTML output
 */

/**
 * Generate Mermaid syntax from a graph
 * @param {{nodes: Map, edges: Array}} graph - The graph to visualize
 * @returns {string} - Mermaid syntax
 */
export function generateMermaidSyntax(graph) {
  const { nodes, edges } = graph;
  const lines = ['graph TD'];

  // Generate node definitions with shapes based on type
  for (const [id, node] of nodes) {
    let shape;
    switch (node.type) {
      case 'error':
        shape = `{{"${node.label}"}}`;
        break;
      case 'auth':
        shape = `(["${node.label}"])`;
        break;
      case 'dashboard':
        shape = `[["${node.label}"]]`;
        break;
      default:
        shape = `["${node.label}"]`;
    }
    lines.push(`  ${id}${shape}`);
  }

  // Generate edges
  for (const edge of edges) {
    if (edge.label && edge.label !== 'Link') {
      lines.push(`  ${edge.from} -->|${edge.label}| ${edge.to}`);
    } else {
      lines.push(`  ${edge.from} --> ${edge.to}`);
    }
  }

  // Add styling
  lines.push('');
  lines.push('  classDef error fill:#ffcccc,stroke:#ff0000');
  lines.push('  classDef auth fill:#ccffcc,stroke:#00ff00');
  lines.push('  classDef dashboard fill:#ccccff,stroke:#0000ff');

  // Apply styles to nodes
  const errorNodes = [];
  const authNodes = [];
  const dashboardNodes = [];

  for (const [id, node] of nodes) {
    switch (node.type) {
      case 'error':
        errorNodes.push(id);
        break;
      case 'auth':
        authNodes.push(id);
        break;
      case 'dashboard':
        dashboardNodes.push(id);
        break;
    }
  }

  if (errorNodes.length > 0) {
    lines.push(`  class ${errorNodes.join(',')} error`);
  }
  if (authNodes.length > 0) {
    lines.push(`  class ${authNodes.join(',')} auth`);
  }
  if (dashboardNodes.length > 0) {
    lines.push(`  class ${dashboardNodes.join(',')} dashboard`);
  }

  return lines.join('\n');
}

/**
 * Convert graph to serializable JSON format
 * @param {{nodes: Map, edges: Array}} graph - The graph
 * @returns {Object} - Serializable graph data
 */
function graphToJSON(graph) {
  const nodes = {};
  for (const [id, node] of graph.nodes) {
    nodes[id] = node;
  }
  return {
    nodes,
    edges: graph.edges,
  };
}

/**
 * Generate complete HTML with Mermaid visualization and interactive path builder
 * @param {{nodes: Map, edges: Array}} graph - The graph to visualize
 * @param {Object} options - Options for HTML generation
 * @returns {string} - Complete HTML document
 */
export function generateHTML(graph, options = {}) {
  const {
    title = 'React Application Flowchart',
    timestamp = new Date().toISOString(),
  } = options;

  const mermaidSyntax = generateMermaidSyntax(graph);
  const nodeCount = graph.nodes.size;
  const edgeCount = graph.edges.length;
  const graphJSON = JSON.stringify(graphToJSON(graph));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    header {
      background: #2c3e50;
      color: white;
      padding: 20px;
    }

    h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }

    .meta {
      font-size: 14px;
      opacity: 0.8;
    }

    .stats {
      display: flex;
      gap: 20px;
      margin-top: 10px;
    }

    .stat {
      background: rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      border-radius: 4px;
    }

    .stat-label {
      font-size: 12px;
      opacity: 0.7;
    }

    .stat-value {
      font-size: 18px;
      font-weight: bold;
    }

    .chart-container {
      padding: 20px;
      display: flex;
      justify-content: center;
      overflow: auto;
      min-height: 300px;
    }

    .mermaid {
      background: white;
      cursor: pointer;
    }

    .mermaid .node {
      cursor: pointer;
    }

    .mermaid .node:hover rect,
    .mermaid .node:hover polygon,
    .mermaid .node:hover circle {
      filter: brightness(0.9);
    }

    footer {
      text-align: center;
      padding: 15px;
      background: #ecf0f1;
      font-size: 12px;
      color: #7f8c8d;
    }

    .legend {
      padding: 15px 20px;
      border-top: 1px solid #ecf0f1;
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }

    .legend-page { background: #e8e8e8; border: 1px solid #666; }
    .legend-error { background: #ffcccc; border: 1px solid #ff0000; }
    .legend-auth { background: #ccffcc; border: 1px solid #00ff00; }
    .legend-dashboard { background: #ccccff; border: 1px solid #0000ff; }

    /* Journey Builder Styles */
    .journey-section {
      border-top: 2px solid #3498db;
      padding: 20px;
      background: #f8f9fa;
    }

    .journey-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .journey-header h2 {
      margin: 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .journey-actions {
      display: flex;
      gap: 10px;
    }

    .journey-actions button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
    }

    .btn-clear {
      background: #e74c3c;
      color: white;
    }

    .btn-clear:hover {
      background: #c0392b;
    }

    .btn-copy {
      background: #3498db;
      color: white;
    }

    .btn-copy:hover {
      background: #2980b9;
    }

    .btn-undo {
      background: #95a5a6;
      color: white;
    }

    .btn-undo:hover {
      background: #7f8c8d;
    }

    .journey-path {
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 15px;
      min-height: 60px;
    }

    .journey-path-empty {
      color: #95a5a6;
      font-style: italic;
    }

    .path-step {
      display: inline-flex;
      align-items: center;
      background: #3498db;
      color: white;
      padding: 4px 10px;
      border-radius: 3px;
      margin: 3px;
      font-size: 13px;
    }

    .path-arrow {
      margin: 0 5px;
      color: #7f8c8d;
    }

    .gherkin-output {
      background: #2c3e50;
      color: #ecf0f1;
      border-radius: 4px;
      padding: 15px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      overflow-x: auto;
    }

    .gherkin-keyword {
      color: #3498db;
      font-weight: bold;
    }

    .gherkin-string {
      color: #2ecc71;
    }

    .instructions {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 10px 15px;
      margin-bottom: 15px;
      font-size: 13px;
      color: #856404;
    }

    .node-selected rect,
    .node-selected polygon {
      stroke: #e74c3c !important;
      stroke-width: 3px !important;
    }

    /* Path Finder Styles */
    .path-finder-section {
      border-top: 2px solid #9b59b6;
      padding: 20px;
      background: #f0f3f8;
    }

    .mode-toggle {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .mode-btn {
      padding: 10px 20px;
      border: 2px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .mode-btn.active {
      border-color: #3498db;
      background: #3498db;
      color: white;
    }

    .selection-info {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
    }

    .selection-box {
      flex: 1;
      padding: 10px;
      border: 2px dashed #ddd;
      border-radius: 4px;
      text-align: center;
    }

    .selection-box.start {
      border-color: #27ae60;
    }

    .selection-box.end {
      border-color: #e74c3c;
    }

    .selection-box.filled {
      background: #f8f9fa;
      border-style: solid;
    }

    .paths-list {
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 15px;
    }

    .path-item {
      padding: 10px;
      margin-bottom: 8px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .path-item:hover {
      border-color: #3498db;
      background: #f8f9fa;
    }

    .path-item.selected {
      border-color: #3498db;
      background: #e8f4fc;
    }

    .path-item-header {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .path-item-nodes {
      font-size: 12px;
      color: #666;
    }

    .test-output {
      background: #1e1e1e;
      color: #d4d4d4;
      border-radius: 4px;
      padding: 15px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre;
      overflow-x: auto;
      max-height: 400px;
    }

    .test-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }

    .btn-generate {
      background: #9b59b6;
      color: white;
    }

    .btn-generate:hover {
      background: #8e44ad;
    }

    .btn-download {
      background: #27ae60;
      color: white;
    }

    .btn-download:hover {
      background: #229954;
    }

    .format-select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
    }

    .node-start rect,
    .node-start polygon {
      stroke: #27ae60 !important;
      stroke-width: 3px !important;
    }

    .node-end rect,
    .node-end polygon {
      stroke: #e74c3c !important;
      stroke-width: 3px !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <div class="meta">Generated: ${timestamp}</div>
      <div class="stats">
        <div class="stat">
          <div class="stat-label">Pages</div>
          <div class="stat-value">${nodeCount}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Links</div>
          <div class="stat-value">${edgeCount}</div>
        </div>
      </div>
    </header>

    <div class="legend">
      <div class="legend-item">
        <div class="legend-color legend-page"></div>
        <span>Regular Page</span>
      </div>
      <div class="legend-item">
        <div class="legend-color legend-dashboard"></div>
        <span>Dashboard</span>
      </div>
      <div class="legend-item">
        <div class="legend-color legend-auth"></div>
        <span>Auth Page</span>
      </div>
      <div class="legend-item">
        <div class="legend-color legend-error"></div>
        <span>Error Page</span>
      </div>
    </div>

    <div class="chart-container">
      <pre class="mermaid">
${mermaidSyntax}
      </pre>
    </div>

    <div class="journey-section">
      <div class="journey-header">
        <h2>User Journey Builder</h2>
        <div class="journey-actions">
          <button class="btn-undo" onclick="undoStep()">Undo</button>
          <button class="btn-clear" onclick="clearJourney()">Clear</button>
          <button class="btn-copy" onclick="copyGherkin()">Copy Gherkin</button>
        </div>
      </div>

      <div class="instructions">
        Click on nodes in the diagram above to build a user journey path. The path will be converted to Gherkin syntax below.
      </div>

      <div class="journey-path" id="journeyPath">
        <span class="journey-path-empty">Click a node to start building your journey...</span>
      </div>

      <div class="gherkin-output" id="gherkinOutput">
<span class="gherkin-keyword">Feature:</span> User Journey

  <span class="gherkin-keyword">Scenario:</span> User navigation path
    <span class="gherkin-keyword">Given</span> the user starts their journey
    <span style="color: #95a5a6;"># Click nodes above to build the journey</span>
      </div>
    </div>

    <div class="path-finder-section">
      <div class="journey-header">
        <h2>Test Generator</h2>
      </div>

      <div class="mode-toggle">
        <button class="mode-btn active" onclick="setMode('journey')">Journey Mode</button>
        <button class="mode-btn" onclick="setMode('pathfind')">Path Finding Mode</button>
      </div>

      <div id="pathFinderUI" style="display: none;">
        <div class="instructions">
          Select a start node (green) and end node (red) to find all paths between them and generate tests.
        </div>

        <div class="selection-info">
          <div class="selection-box start" id="startNodeBox">
            <strong>Start Node</strong><br>
            <span id="startNodeLabel">Click a node...</span>
          </div>
          <div class="selection-box end" id="endNodeBox">
            <strong>End Node</strong><br>
            <span id="endNodeLabel">Click a node...</span>
          </div>
        </div>

        <button class="journey-actions button btn-generate" onclick="findPaths()" style="margin-bottom: 15px; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
          Find Paths
        </button>
        <button class="journey-actions button btn-clear" onclick="clearSelection()" style="margin-bottom: 15px; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
          Clear Selection
        </button>

        <div class="paths-list" id="pathsList"></div>

        <div class="test-actions">
          <select class="format-select" id="testFormat">
            <option value="playwright">Playwright</option>
            <option value="cypress">Cypress</option>
            <option value="gherkin">Gherkin</option>
          </select>
          <button class="journey-actions button btn-generate" onclick="generateTest()" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            Generate Test
          </button>
          <button class="journey-actions button btn-download" onclick="downloadTest()" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            Download
          </button>
          <button class="journey-actions button btn-copy" onclick="copyTest()" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            Copy
          </button>
        </div>

        <div class="test-output" id="testOutput">// Select a path and click "Generate Test" to see the test code here</div>
      </div>
    </div>

    <footer>
      Generated by React Flowchart Generator
    </footer>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    // Graph data
    const graphData = ${graphJSON};

    // Journey state
    let journeyPath = [];

    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      securityLevel: 'loose'
    });

    // Wait for Mermaid to render, then add click handlers
    setTimeout(() => {
      addNodeClickHandlers();
    }, 500);

    function addNodeClickHandlers() {
      const nodes = document.querySelectorAll('.mermaid .node');
      nodes.forEach(node => {
        node.style.cursor = 'pointer';
        node.addEventListener('click', (e) => {
          const nodeId = node.id.replace('flowchart-', '').split('-')[0];
          handleNodeClick(nodeId);
        });
      });
    }

    function handleNodeClick(nodeId) {
      const nodeData = graphData.nodes[nodeId];
      if (!nodeData) return;

      // Find the edge/action from the previous node
      let action = 'navigates to';
      if (journeyPath.length > 0) {
        const prevNodeId = journeyPath[journeyPath.length - 1].id;
        const edge = graphData.edges.find(e => e.from === prevNodeId && e.to === nodeId);
        if (edge) {
          action = edge.action || 'navigates to';
        }
      }

      journeyPath.push({
        id: nodeId,
        path: nodeData.path,
        component: nodeData.component,
        action: action
      });

      updateJourneyDisplay();
      updateGherkinOutput();
      highlightSelectedNodes();
    }

    function updateJourneyDisplay() {
      const container = document.getElementById('journeyPath');

      if (journeyPath.length === 0) {
        container.innerHTML = '<span class="journey-path-empty">Click a node to start building your journey...</span>';
        return;
      }

      let html = '';
      journeyPath.forEach((step, index) => {
        if (index > 0) {
          html += '<span class="path-arrow">→</span>';
        }
        html += \`<span class="path-step">\${step.path}</span>\`;
      });

      container.innerHTML = html;
    }

    function updateGherkinOutput() {
      const container = document.getElementById('gherkinOutput');

      if (journeyPath.length === 0) {
        container.innerHTML = \`<span class="gherkin-keyword">Feature:</span> User Journey

  <span class="gherkin-keyword">Scenario:</span> User navigation path
    <span class="gherkin-keyword">Given</span> the user starts their journey
    <span style="color: #95a5a6;"># Click nodes above to build the journey</span>\`;
        return;
      }

      let gherkin = \`<span class="gherkin-keyword">Feature:</span> User Journey

  <span class="gherkin-keyword">Scenario:</span> User navigation path\`;

      journeyPath.forEach((step, index) => {
        if (index === 0) {
          gherkin += \`
    <span class="gherkin-keyword">Given</span> the user is on the <span class="gherkin-string">"\${step.path}"</span> page\`;
        } else {
          const keyword = index === 1 ? 'When' : 'And';
          gherkin += \`
    <span class="gherkin-keyword">\${keyword}</span> the user \${step.action} <span class="gherkin-string">"\${step.path}"</span>\`;
        }
      });

      if (journeyPath.length > 0) {
        const lastStep = journeyPath[journeyPath.length - 1];
        gherkin += \`
    <span class="gherkin-keyword">Then</span> the user should be on the <span class="gherkin-string">"\${lastStep.path}"</span> page\`;
      }

      container.innerHTML = gherkin;
    }

    function highlightSelectedNodes() {
      // Remove previous highlights
      document.querySelectorAll('.node-selected').forEach(el => {
        el.classList.remove('node-selected');
      });

      // Add highlights to selected nodes
      journeyPath.forEach(step => {
        const nodeElements = document.querySelectorAll(\`.mermaid .node[id*="\${step.id}"]\`);
        nodeElements.forEach(el => el.classList.add('node-selected'));
      });
    }

    function clearJourney() {
      journeyPath = [];
      updateJourneyDisplay();
      updateGherkinOutput();
      highlightSelectedNodes();
    }

    function undoStep() {
      if (journeyPath.length > 0) {
        journeyPath.pop();
        updateJourneyDisplay();
        updateGherkinOutput();
        highlightSelectedNodes();
      }
    }

    function copyGherkin() {
      if (journeyPath.length === 0) {
        alert('Build a journey first by clicking on nodes!');
        return;
      }

      // Generate plain text Gherkin
      let gherkin = 'Feature: User Journey\\n\\n  Scenario: User navigation path\\n';

      journeyPath.forEach((step, index) => {
        if (index === 0) {
          gherkin += \`    Given the user is on the "\${step.path}" page\\n\`;
        } else {
          const keyword = index === 1 ? 'When' : 'And';
          gherkin += \`    \${keyword} the user \${step.action} "\${step.path}"\\n\`;
        }
      });

      if (journeyPath.length > 0) {
        const lastStep = journeyPath[journeyPath.length - 1];
        gherkin += \`    Then the user should be on the "\${lastStep.path}" page\\n\`;
      }

      navigator.clipboard.writeText(gherkin).then(() => {
        const btn = document.querySelector('.btn-copy');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
      });
    }

    // Path Finder Mode
    let currentMode = 'journey';
    let startNode = null;
    let endNode = null;
    let foundPaths = [];
    let selectedPathIndex = -1;
    let generatedTestCode = '';

    function setMode(mode) {
      currentMode = mode;

      // Update button states
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');

      // Show/hide UI sections
      const pathFinderUI = document.getElementById('pathFinderUI');
      if (mode === 'pathfind') {
        pathFinderUI.style.display = 'block';
      } else {
        pathFinderUI.style.display = 'none';
        clearSelection();
      }
    }

    function handleNodeClickPathfind(nodeId) {
      const nodeData = graphData.nodes[nodeId];
      if (!nodeData) return;

      if (!startNode) {
        startNode = nodeId;
        document.getElementById('startNodeLabel').textContent = nodeData.path;
        document.getElementById('startNodeBox').classList.add('filled');
      } else if (!endNode && nodeId !== startNode) {
        endNode = nodeId;
        document.getElementById('endNodeLabel').textContent = nodeData.path;
        document.getElementById('endNodeBox').classList.add('filled');
      }

      updatePathfindHighlights();
    }

    function updatePathfindHighlights() {
      // Clear all highlights
      document.querySelectorAll('.node-start, .node-end').forEach(el => {
        el.classList.remove('node-start', 'node-end');
      });

      // Highlight start node
      if (startNode) {
        const startElements = document.querySelectorAll(\`.mermaid .node[id*="\${startNode}"]\`);
        startElements.forEach(el => el.classList.add('node-start'));
      }

      // Highlight end node
      if (endNode) {
        const endElements = document.querySelectorAll(\`.mermaid .node[id*="\${endNode}"]\`);
        endElements.forEach(el => el.classList.add('node-end'));
      }
    }

    function clearSelection() {
      startNode = null;
      endNode = null;
      foundPaths = [];
      selectedPathIndex = -1;
      generatedTestCode = '';

      document.getElementById('startNodeLabel').textContent = 'Click a node...';
      document.getElementById('endNodeLabel').textContent = 'Click a node...';
      document.getElementById('startNodeBox').classList.remove('filled');
      document.getElementById('endNodeBox').classList.remove('filled');
      document.getElementById('pathsList').innerHTML = '';
      document.getElementById('testOutput').textContent = '// Select a path and click "Generate Test" to see the test code here';

      updatePathfindHighlights();
    }

    function findAllPathsBFS(startId, endId, maxPaths = 10, maxLength = 10) {
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

        const outgoingEdges = graphData.edges.filter(e => e.from === currentNode);

        for (const edge of outgoingEdges) {
          if (!currentPath.includes(edge.to)) {
            queue.push([...currentPath, edge.to]);
          }
        }
      }

      paths.sort((a, b) => a.length - b.length);
      return paths;
    }

    function findPaths() {
      if (!startNode || !endNode) {
        alert('Please select both start and end nodes');
        return;
      }

      foundPaths = findAllPathsBFS(startNode, endNode);

      const pathsList = document.getElementById('pathsList');

      if (foundPaths.length === 0) {
        pathsList.innerHTML = '<div class="instructions">No paths found between selected nodes</div>';
        return;
      }

      let html = '';
      foundPaths.forEach((path, index) => {
        const pathNodes = path.map(id => graphData.nodes[id]?.path || id).join(' → ');
        html += \`
          <div class="path-item" onclick="selectPath(\${index})">
            <div class="path-item-header">Path \${index + 1} (\${path.length} steps)</div>
            <div class="path-item-nodes">\${pathNodes}</div>
          </div>
        \`;
      });

      pathsList.innerHTML = html;
    }

    function selectPath(index) {
      selectedPathIndex = index;

      // Update UI
      document.querySelectorAll('.path-item').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
      });
    }

    function generateTest() {
      if (selectedPathIndex < 0 || !foundPaths[selectedPathIndex]) {
        alert('Please select a path first');
        return;
      }

      const path = foundPaths[selectedPathIndex];
      const format = document.getElementById('testFormat').value;

      switch (format) {
        case 'playwright':
          generatedTestCode = generatePlaywrightCode(path);
          break;
        case 'cypress':
          generatedTestCode = generateCypressCode(path);
          break;
        case 'gherkin':
          generatedTestCode = generateGherkinCode(path);
          break;
      }

      document.getElementById('testOutput').textContent = generatedTestCode;
    }

    function generatePlaywrightCode(path) {
      const startNode = graphData.nodes[path[0]];
      const endNode = graphData.nodes[path[path.length - 1]];
      const testName = \`\${startNode?.component || 'Start'} to \${endNode?.component || 'End'}\`;

      let code = \`import { test, expect } from '@playwright/test';

test('\${testName}', async ({ page }) => {
  test.setTimeout(30000);

\`;

      for (let i = 0; i < path.length; i++) {
        const nodeId = path[i];
        const node = graphData.nodes[nodeId];
        if (!node) continue;

        if (i === 0) {
          code += \`  // Navigate to start page
  await page.goto('http://localhost:3000\${node.path}');

\`;
        } else {
          const prevNodeId = path[i - 1];
          const edge = graphData.edges.find(e => e.from === prevNodeId && e.to === nodeId);
          const action = edge?.action || 'navigate to';

          code += \`  // \${action} \${node.path}
  await page.click('a[href="\${node.path}"], [data-testid="\${node.path.replace(/\\//g, '-').substring(1) || 'home'}"]');

  // Verify URL
  await expect(page).toHaveURL('\${node.path}');

\`;
        }
      }

      code += '});';
      return code;
    }

    function generateCypressCode(path) {
      const startNode = graphData.nodes[path[0]];
      const endNode = graphData.nodes[path[path.length - 1]];
      const testName = \`\${startNode?.component || 'Start'} to \${endNode?.component || 'End'}\`;

      let code = \`describe('\${testName}', () => {
  it('should complete the journey', () => {
\`;

      for (let i = 0; i < path.length; i++) {
        const nodeId = path[i];
        const node = graphData.nodes[nodeId];
        if (!node) continue;

        if (i === 0) {
          code += \`    // Navigate to start page
    cy.visit('\${node.path}');

\`;
        } else {
          const prevNodeId = path[i - 1];
          const edge = graphData.edges.find(e => e.from === prevNodeId && e.to === nodeId);
          const action = edge?.action || 'navigate to';

          code += \`    // \${action} \${node.path}
    cy.get('a[href="\${node.path}"], [data-testid="\${node.path.replace(/\\//g, '-').substring(1) || 'home'}"]').click();

    // Verify URL
    cy.url().should('include', '\${node.path}');

\`;
        }
      }

      code += \`  });
});\`;
      return code;
    }

    function generateGherkinCode(path) {
      const startNode = graphData.nodes[path[0]];
      const endNode = graphData.nodes[path[path.length - 1]];

      let code = \`Feature: User Journey from \${startNode?.component || 'Start'} to \${endNode?.component || 'End'}

  Scenario: Navigate through the application
\`;

      for (let i = 0; i < path.length; i++) {
        const nodeId = path[i];
        const node = graphData.nodes[nodeId];
        if (!node) continue;

        if (i === 0) {
          code += \`    Given the user is on the "\${node.path}" page
\`;
        } else {
          const prevNodeId = path[i - 1];
          const edge = graphData.edges.find(e => e.from === prevNodeId && e.to === nodeId);
          const action = edge?.action || 'navigates to';
          const keyword = i === 1 ? 'When' : 'And';

          code += \`    \${keyword} the user \${action} "\${node.path}"
\`;
        }
      }

      if (path.length > 0) {
        const lastNode = graphData.nodes[path[path.length - 1]];
        code += \`    Then the user should be on the "\${lastNode?.path}" page
\`;
      }

      return code;
    }

    function downloadTest() {
      if (!generatedTestCode) {
        alert('Generate a test first');
        return;
      }

      const format = document.getElementById('testFormat').value;
      let filename, mimeType;

      switch (format) {
        case 'playwright':
          filename = 'test.spec.js';
          mimeType = 'text/javascript';
          break;
        case 'cypress':
          filename = 'test.cy.js';
          mimeType = 'text/javascript';
          break;
        case 'gherkin':
          filename = 'test.feature';
          mimeType = 'text/plain';
          break;
      }

      const blob = new Blob([generatedTestCode], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    function copyTest() {
      if (!generatedTestCode) {
        alert('Generate a test first');
        return;
      }

      navigator.clipboard.writeText(generatedTestCode).then(() => {
        alert('Test code copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
      });
    }

    // Override handleNodeClick to support both modes
    const originalHandleNodeClick = handleNodeClick;
    handleNodeClick = function(nodeId) {
      if (currentMode === 'pathfind') {
        handleNodeClickPathfind(nodeId);
      } else {
        originalHandleNodeClick(nodeId);
      }
    };
  </script>
</body>
</html>`;
}
