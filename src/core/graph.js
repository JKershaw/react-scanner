/**
 * Graph builder module - Convert scanner output into graph representation
 */

import path from 'path';

/**
 * Infer the route path from a component filename
 * @param {string} filename - The filename (e.g., 'Home.jsx')
 * @param {Array} routes - Array of route definitions
 * @returns {string|null} - The matching route path or null
 */
export function inferSourcePath(filename, routes) {
  // Extract component name from filename (e.g., 'Home.jsx' -> 'Home')
  const baseName = path.basename(filename, path.extname(filename));

  // Try exact match first (component name matches)
  for (const route of routes) {
    if (route.component === baseName) {
      return route.path;
    }
  }

  // Try fuzzy match (path contains lowercase component name)
  const lowerBaseName = baseName.toLowerCase();
  for (const route of routes) {
    const pathParts = route.path.toLowerCase().split('/').filter(Boolean);
    if (pathParts.some(part => part === lowerBaseName || part.includes(lowerBaseName))) {
      return route.path;
    }
  }

  // Special cases
  if (lowerBaseName === 'home' || lowerBaseName === 'index') {
    const rootRoute = routes.find(r => r.path === '/' || r.path === '');
    if (rootRoute) return rootRoute.path;
  }

  if (lowerBaseName === 'notfound' || lowerBaseName === 'error404') {
    const notFoundRoute = routes.find(r => r.path === '*');
    if (notFoundRoute) return notFoundRoute.path;
  }

  return null;
}

/**
 * Sanitize a path to create a valid graph node ID
 * @param {string} routePath - The route path
 * @returns {string} - Sanitized ID
 */
export function sanitizeId(routePath) {
  if (!routePath) return 'unknown';

  // Replace special characters with underscores
  let id = routePath
    .replace(/^\//, '') // Remove leading slash
    .replace(/\//g, '_')
    .replace(/:/g, 'param_')
    .replace(/\?/g, '_q_')
    .replace(/\*/g, 'wildcard')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_') // Remove multiple underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

  // Handle root path
  if (id === '' || routePath === '/') {
    id = 'root';
  }

  return id;
}

/**
 * Create a label for a graph node
 * @param {string} routePath - The route path
 * @param {string} component - The component name
 * @returns {string} - Node label
 */
export function createNodeLabel(routePath, component) {
  if (routePath === '/') {
    return `/ (${component})`;
  }
  return `${routePath}\\n(${component})`;
}

/**
 * Determine node type based on route/component
 * @param {string} routePath - The route path
 * @param {string} component - The component name
 * @returns {string} - Node type
 */
export function getNodeType(routePath, component) {
  const lowerComp = component.toLowerCase();
  const lowerPath = routePath.toLowerCase();

  if (routePath === '*' || lowerComp.includes('notfound') || lowerComp.includes('error')) {
    return 'error';
  }

  if (lowerComp.includes('auth') || lowerComp.includes('login') || lowerComp.includes('signup')) {
    return 'auth';
  }

  if (lowerPath.includes('dashboard') || lowerPath.includes('admin')) {
    return 'dashboard';
  }

  return 'page';
}

/**
 * Build a mapping of component names to the page files that import them
 * @param {Array} imports - Array of import records
 * @param {Array} routes - Array of route definitions
 * @returns {Map<string, Array<string>>} - Map from component name to array of importing page filenames
 */
export function buildImportGraph(imports, routes) {
  const importGraph = new Map();

  for (const imp of imports) {
    // Extract the component name from the import source
    // e.g., './Sidebar' -> 'Sidebar', '../components/Sidebar' -> 'Sidebar'
    const sourceParts = imp.source.split('/');
    const sourceFile = sourceParts[sourceParts.length - 1].replace(/\.(jsx?|tsx?)$/, '');

    // The imported name might differ from the filename (aliased imports)
    // We track by the imported name as that's what appears in the code
    const componentName = imp.imported;

    if (!importGraph.has(componentName)) {
      importGraph.set(componentName, []);
    }

    importGraph.get(componentName).push(imp.fromFile);
  }

  return importGraph;
}

/**
 * Find all page source paths for a given file, including via imports
 * @param {string} filename - The filename to find sources for
 * @param {Array} routes - Array of route definitions
 * @param {Map} importGraph - Map of component names to importing files
 * @returns {Array<string>} - Array of route paths
 */
export function findSourcePaths(filename, routes, importGraph) {
  const sourcePaths = [];

  // First, try direct match
  const directPath = inferSourcePath(filename, routes);
  if (directPath !== null) {
    sourcePaths.push(directPath);
    return sourcePaths;
  }

  // If no direct match, this might be a shared component
  // Find all pages that import this component
  const baseName = path.basename(filename, path.extname(filename));

  // Check if any pages import this component
  const importingFiles = importGraph.get(baseName) || [];

  for (const importingFile of importingFiles) {
    // Recursively find the source path for the importing file
    const importingPaths = findSourcePaths(importingFile, routes, importGraph);
    for (const p of importingPaths) {
      if (!sourcePaths.includes(p)) {
        sourcePaths.push(p);
      }
    }
  }

  return sourcePaths;
}

/**
 * Build a graph from scanner output
 * @param {Object} scanResult - Result from scanProject
 * @returns {{nodes: Map, edges: Array}}
 */
export function buildGraph(scanResult) {
  const { routes, links, imports = [], components = [] } = scanResult;
  const nodes = new Map();
  const edges = [];

  // Build import graph for shared component resolution
  const importGraph = buildImportGraph(imports, routes);

  // Create nodes from routes (or components if no routes)
  const nodeSource = routes.length > 0 ? routes : components;

  for (const item of nodeSource) {
    const id = sanitizeId(item.path);

    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        path: item.path,
        label: createNodeLabel(item.path, item.component),
        type: item.type || getNodeType(item.path, item.component),
        component: item.component,
      });
    }
  }

  // Create edges from links
  for (const link of links) {
    const sourcePaths = findSourcePaths(link.fromFile, nodeSource, importGraph);
    const targetId = sanitizeId(link.to);

    for (const sourcePath of sourcePaths) {
      const sourceId = sanitizeId(sourcePath);

      // Only add edge if both source and target nodes exist
      if (nodes.has(sourceId) && nodes.has(targetId)) {
        // Check for duplicate edges
        const isDuplicate = edges.some(
          e => e.from === sourceId && e.to === targetId
        );

        if (!isDuplicate) {
          edges.push({
            from: sourceId,
            to: targetId,
            label: link.type,
            type: link.type,
            action: link.action || 'navigates to',
            targetPath: link.to,
          });
        }
      }
    }
  }

  // If using components and no links, create edges from imports
  if (routes.length === 0 && links.length === 0 && components.length > 0) {
    // Create edges based on component imports
    for (const imp of imports) {
      // Find source component
      const sourceComponent = components.find(c =>
        path.basename(c.file, path.extname(c.file)) ===
        path.basename(imp.file, path.extname(imp.file))
      );

      // Find target component
      const targetComponent = components.find(c => c.component === imp.imported);

      if (sourceComponent && targetComponent) {
        const sourceId = sanitizeId(sourceComponent.path);
        const targetId = sanitizeId(targetComponent.path);

        if (nodes.has(sourceId) && nodes.has(targetId) && sourceId !== targetId) {
          // Check for duplicate edges
          const isDuplicate = edges.some(
            e => e.from === sourceId && e.to === targetId
          );

          if (!isDuplicate) {
            edges.push({
              from: sourceId,
              to: targetId,
              label: 'imports',
              type: 'import',
              action: 'imports component',
              targetPath: targetComponent.path,
            });
          }
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Validate a graph and return warnings
 * @param {{nodes: Map, edges: Array}} graph - The graph to validate
 * @returns {Array<string>} - Array of warning messages
 */
export function validateGraph(graph) {
  const warnings = [];
  const { nodes, edges } = graph;

  // Check for orphaned edges (edges pointing to non-existent nodes)
  for (const edge of edges) {
    if (!nodes.has(edge.from)) {
      warnings.push(`Edge source '${edge.from}' does not exist`);
    }
    if (!nodes.has(edge.to)) {
      warnings.push(`Edge target '${edge.to}' does not exist`);
    }
  }

  // Check for isolated nodes (nodes with no connections)
  for (const [id, node] of nodes) {
    const hasIncoming = edges.some(e => e.to === id);
    const hasOutgoing = edges.some(e => e.from === id);

    if (!hasIncoming && !hasOutgoing && nodes.size > 1) {
      warnings.push(`Node '${id}' (${node.component}) is isolated`);
    }
  }

  return warnings;
}
