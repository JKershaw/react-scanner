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
 * Extract a string value from various AST node types
 * @param {Object} node - AST node
 * @returns {string|null} - Extracted string value or null
 */
function extractStringValue(node) {
  if (!node) return null;

  if (node.type === 'StringLiteral') {
    return node.value;
  } else if (node.type === 'TemplateLiteral' && node.quasis.length === 1) {
    return node.quasis[0].value.raw;
  }
  return null;
}

/**
 * Find navigate calls within a function body or expression
 * @param {Object} node - AST node to search
 * @returns {Array<string>} - Array of navigation targets
 */
function findNavigateTargets(node) {
  const targets = [];

  if (!node) return targets;

  // Handle arrow function with direct navigate call
  if (node.type === 'ArrowFunctionExpression') {
    if (node.body.type === 'CallExpression') {
      const target = extractNavigateTarget(node.body);
      if (target) targets.push(target);
    } else if (node.body.type === 'BlockStatement') {
      // Search block for navigate calls
      for (const stmt of node.body.body) {
        if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
          const target = extractNavigateTarget(stmt.expression);
          if (target) targets.push(target);
        }
      }
    }
  }

  // Handle function expression
  if (node.type === 'FunctionExpression' && node.body.type === 'BlockStatement') {
    for (const stmt of node.body.body) {
      if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
        const target = extractNavigateTarget(stmt.expression);
        if (target) targets.push(target);
      }
    }
  }

  // Handle direct call expression
  if (node.type === 'CallExpression') {
    const target = extractNavigateTarget(node);
    if (target) targets.push(target);
  }

  return targets;
}

/**
 * Extract navigate target from a call expression
 * @param {Object} callExpr - CallExpression AST node
 * @returns {string|null} - Navigation target or null
 */
function extractNavigateTarget(callExpr) {
  if (callExpr.callee.type === 'Identifier' && callExpr.callee.name === 'navigate') {
    if (callExpr.arguments.length > 0) {
      return extractStringValue(callExpr.arguments[0]);
    }
  }
  return null;
}

/**
 * Extract navigation links from a file
 * @param {string} filePath - Path to the file to scan
 * @returns {Array<{to: string, fromFile: string, line: number, type: string, action: string}>}
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

      if (elementName.type !== 'JSXIdentifier') return;

      // Handle Link and NavLink
      if (elementName.name === 'Link' || elementName.name === 'NavLink') {
        const toAttr = openingElement.attributes.find(
          attr => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'to'
        );

        if (toAttr && toAttr.value) {
          let toValue = null;

          if (toAttr.value.type === 'StringLiteral') {
            toValue = toAttr.value.value;
          } else if (toAttr.value.type === 'JSXExpressionContainer') {
            toValue = extractStringValue(toAttr.value.expression);
          }

          if (toValue !== null) {
            links.push({
              to: toValue,
              fromFile: fileName,
              line: nodePath.node.loc?.start.line || 0,
              type: elementName.name,
              action: 'clicks link',
            });
          }
        }
      }

      // Handle button onClick
      if (elementName.name === 'button' || elementName.name === 'Button') {
        const onClickAttr = openingElement.attributes.find(
          attr => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'onClick'
        );

        if (onClickAttr && onClickAttr.value && onClickAttr.value.type === 'JSXExpressionContainer') {
          const targets = findNavigateTargets(onClickAttr.value.expression);
          for (const target of targets) {
            links.push({
              to: target,
              fromFile: fileName,
              line: nodePath.node.loc?.start.line || 0,
              type: 'button',
              action: 'clicks button',
            });
          }
        }
      }

      // Handle form onSubmit
      if (elementName.name === 'form' || elementName.name === 'Form') {
        const onSubmitAttr = openingElement.attributes.find(
          attr => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'onSubmit'
        );

        if (onSubmitAttr && onSubmitAttr.value && onSubmitAttr.value.type === 'JSXExpressionContainer') {
          const targets = findNavigateTargets(onSubmitAttr.value.expression);
          for (const target of targets) {
            links.push({
              to: target,
              fromFile: fileName,
              line: nodePath.node.loc?.start.line || 0,
              type: 'form',
              action: 'submits form',
            });
          }
        }
      }
    },

    // Find navigate() calls (standalone, not in onClick/onSubmit)
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;

      if (callee.type === 'Identifier' && callee.name === 'navigate') {
        // Check if this is already captured by onClick/onSubmit handler
        const parent = nodePath.parent;
        if (parent && parent.type === 'ArrowFunctionExpression') {
          // Skip - will be captured by JSXElement handler
          return;
        }

        const args = nodePath.node.arguments;
        if (args.length > 0) {
          const toValue = extractStringValue(args[0]);

          if (toValue !== null) {
            links.push({
              to: toValue,
              fromFile: fileName,
              line: nodePath.node.loc?.start.line || 0,
              type: 'navigate',
              action: 'navigates to',
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
