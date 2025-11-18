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
 * Build a graph from scanner output
 * @param {Object} scanResult - Result from scanProject
 * @returns {{nodes: Map, edges: Array}}
 */
export function buildGraph(scanResult) {
  const { routes, links } = scanResult;
  const nodes = new Map();
  const edges = [];

  // Create nodes from routes
  for (const route of routes) {
    const id = sanitizeId(route.path);

    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        path: route.path,
        label: createNodeLabel(route.path, route.component),
        type: getNodeType(route.path, route.component),
        component: route.component,
      });
    }
  }

  // Create edges from links
  for (const link of links) {
    const sourcePath = inferSourcePath(link.fromFile, routes);
    const targetId = sanitizeId(link.to);

    if (sourcePath !== null) {
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
          });
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
