/**
 * Utility functions for React Flowchart Generator
 */

/**
 * Sanitize a path to prevent directory traversal attacks
 * @param {string} inputPath - The path to sanitize
 * @returns {string} - Sanitized path
 */
export function sanitizePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }

  // Remove any path traversal attempts
  let sanitized = inputPath
    .replace(/\.\./g, '')
    .replace(/\/\//g, '/')
    .replace(/\\/g, '/');

  // Remove leading slashes to prevent absolute path access
  while (sanitized.startsWith('/')) {
    sanitized = sanitized.substring(1);
  }

  return sanitized;
}

/**
 * Validate a route path format
 * @param {string} route - The route to validate
 * @returns {boolean} - True if valid route format
 */
export function validateRoute(route) {
  if (!route || typeof route !== 'string') {
    return false;
  }

  // Route should start with / or be a wildcard
  if (!route.startsWith('/') && route !== '*') {
    return false;
  }

  // Check for invalid characters
  const invalidChars = /[<>"|?#]/;
  if (invalidChars.test(route)) {
    return false;
  }

  return true;
}

/**
 * Format a test name from a path
 * @param {Array<string>} path - Array of node IDs
 * @param {Object} nodes - Nodes object
 * @returns {string} - Formatted test name
 */
export function formatTestName(path, nodes) {
  if (!path || path.length === 0) {
    return 'Empty test';
  }

  const startLabel = nodes[path[0]]?.label || path[0];
  const endLabel = nodes[path[path.length - 1]]?.label || path[path.length - 1];

  // Clean up labels for test names
  const cleanLabel = (label) => {
    return label
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  };

  return `Navigate from ${cleanLabel(startLabel)} to ${cleanLabel(endLabel)}`;
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Debounce a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix
 * @returns {string} - Unique ID
 */
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Parse error message from various error types
 * @param {Error|string|Object} error - Error to parse
 * @returns {string} - Error message
 */
export function parseErrorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error.message) {
    return error.message;
  }

  if (error.error) {
    return typeof error.error === 'string' ? error.error : 'Unknown error';
  }

  return 'Unknown error';
}
