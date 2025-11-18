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
 * Generate complete HTML with Mermaid visualization
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
      max-width: 1200px;
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
    }

    .mermaid {
      background: white;
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

    <footer>
      Generated by React Flowchart Generator
    </footer>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  </script>
</body>
</html>`;
}
