/**
 * Scanner module - Extract routes and links from React files using AST traversal
 */

import fs from 'fs';
import path from 'path';
import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';

// Handle both ESM and CommonJS exports from @babel/traverse
const traverse = _traverse.default || _traverse;

/**
 * Parse a file and return its AST
 * @param {string} filePath - Path to the file to parse
 * @returns {Object|null} - AST or null if parsing fails
 */
export function parseFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    return parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (error) {
    console.warn(`Warning: Could not parse ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Extract route definitions from a file
 * @param {string} filePath - Path to the file to scan
 * @returns {Array<{path: string, component: string, line: number}>}
 */
export function findRoutes(filePath) {
  const ast = parseFile(filePath);
  if (!ast) return [];

  const routes = [];

  traverse(ast, {
    JSXElement(nodePath) {
      const openingElement = nodePath.node.openingElement;
      const elementName = openingElement.name;

      // Check if it's a Route component
      if (elementName.type === 'JSXIdentifier' && elementName.name === 'Route') {
        const pathAttr = openingElement.attributes.find(
          attr => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'path'
        );

        const elementAttr = openingElement.attributes.find(
          attr => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'element'
        );

        let routePath = null;
        let component = null;

        // Extract path value
        if (pathAttr && pathAttr.value) {
          if (pathAttr.value.type === 'StringLiteral') {
            routePath = pathAttr.value.value;
          } else if (pathAttr.value.type === 'JSXExpressionContainer') {
            const expr = pathAttr.value.expression;
            if (expr.type === 'StringLiteral') {
              routePath = expr.value;
            } else if (expr.type === 'TemplateLiteral' && expr.quasis.length === 1) {
              routePath = expr.quasis[0].value.raw;
            }
          }
        }

        // Extract component name from element prop
        if (elementAttr && elementAttr.value) {
          if (elementAttr.value.type === 'JSXExpressionContainer') {
            const expr = elementAttr.value.expression;
            if (expr.type === 'JSXElement') {
              const compName = expr.openingElement.name;
              if (compName.type === 'JSXIdentifier') {
                component = compName.name;
              }
            } else if (expr.type === 'Identifier') {
              component = expr.name;
            }
          }
        }

        if (routePath !== null) {
          routes.push({
            path: routePath,
            component: component || 'Unknown',
            line: nodePath.node.loc?.start.line || 0,
          });
        }
      }
    },
  });

  return routes;
}

/**
 * Extract navigation links from a file
 * @param {string} filePath - Path to the file to scan
 * @returns {Array<{to: string, fromFile: string, line: number, type: string}>}
 */
export function findLinks(filePath) {
  const ast = parseFile(filePath);
  if (!ast) return [];

  const links = [];
  const fileName = path.basename(filePath);

  traverse(ast, {
    // Find Link and NavLink components
    JSXElement(nodePath) {
      const openingElement = nodePath.node.openingElement;
      const elementName = openingElement.name;

      if (elementName.type === 'JSXIdentifier' &&
          (elementName.name === 'Link' || elementName.name === 'NavLink')) {

        const toAttr = openingElement.attributes.find(
          attr => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'to'
        );

        if (toAttr && toAttr.value) {
          let toValue = null;

          if (toAttr.value.type === 'StringLiteral') {
            toValue = toAttr.value.value;
          } else if (toAttr.value.type === 'JSXExpressionContainer') {
            const expr = toAttr.value.expression;
            if (expr.type === 'StringLiteral') {
              toValue = expr.value;
            } else if (expr.type === 'TemplateLiteral' && expr.quasis.length === 1) {
              toValue = expr.quasis[0].value.raw;
            }
          }

          if (toValue !== null) {
            links.push({
              to: toValue,
              fromFile: fileName,
              line: nodePath.node.loc?.start.line || 0,
              type: elementName.name,
            });
          }
        }
      }
    },

    // Find navigate() calls
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;

      if (callee.type === 'Identifier' && callee.name === 'navigate') {
        const args = nodePath.node.arguments;
        if (args.length > 0) {
          const firstArg = args[0];
          let toValue = null;

          if (firstArg.type === 'StringLiteral') {
            toValue = firstArg.value;
          } else if (firstArg.type === 'TemplateLiteral' && firstArg.quasis.length === 1) {
            toValue = firstArg.quasis[0].value.raw;
          }

          if (toValue !== null) {
            links.push({
              to: toValue,
              fromFile: fileName,
              line: nodePath.node.loc?.start.line || 0,
              type: 'navigate',
            });
          }
        }
      }
    },
  });

  return links;
}

/**
 * Recursively scan a directory for React files
 * @param {string} dirPath - Directory to scan
 * @returns {Array<string>} - Array of file paths
 */
export function scanDirectory(dirPath) {
  const files = [];

  function scan(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and other common non-source directories
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
            scan(fullPath);
          }
        } else if (entry.isFile()) {
          // Include .jsx, .tsx, .js, .ts files
          if (/\.(jsx?|tsx?)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${currentPath}: ${error.message}`);
    }
  }

  scan(dirPath);
  return files;
}

/**
 * Scan all files in a directory and extract routes and links
 * @param {string} dirPath - Directory to scan
 * @returns {{routes: Array, links: Array, files: Array}}
 */
export function scanProject(dirPath) {
  const files = scanDirectory(dirPath);
  const allRoutes = [];
  const allLinks = [];

  for (const file of files) {
    const routes = findRoutes(file);
    const links = findLinks(file);

    allRoutes.push(...routes.map(r => ({ ...r, file })));
    allLinks.push(...links.map(l => ({ ...l, file })));
  }

  return {
    routes: allRoutes,
    links: allLinks,
    files,
  };
}
