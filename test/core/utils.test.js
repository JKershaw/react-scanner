/**
 * Utility functions tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  sanitizePath,
  validateRoute,
  formatTestName,
  deepClone,
  generateId,
  formatFileSize,
  parseErrorMessage,
} from '../../src/core/utils.js';

describe('Utils', () => {
  describe('sanitizePath', () => {
    it('should remove directory traversal attempts', () => {
      assert.strictEqual(sanitizePath('../etc/passwd'), 'etc/passwd');
      assert.strictEqual(sanitizePath('../../secret'), 'secret');
    });

    it('should remove leading slashes', () => {
      assert.strictEqual(sanitizePath('/etc/passwd'), 'etc/passwd');
      assert.strictEqual(sanitizePath('//double'), 'double');
    });

    it('should normalize backslashes', () => {
      assert.strictEqual(sanitizePath('path\\to\\file'), 'path/to/file');
    });

    it('should handle empty input', () => {
      assert.strictEqual(sanitizePath(''), '');
      assert.strictEqual(sanitizePath(null), '');
      assert.strictEqual(sanitizePath(undefined), '');
    });
  });

  describe('validateRoute', () => {
    it('should accept valid routes', () => {
      assert.strictEqual(validateRoute('/'), true);
      assert.strictEqual(validateRoute('/home'), true);
      assert.strictEqual(validateRoute('/user/:id'), true);
      assert.strictEqual(validateRoute('*'), true);
    });

    it('should reject invalid routes', () => {
      assert.strictEqual(validateRoute(''), false);
      assert.strictEqual(validateRoute('home'), false);
      assert.strictEqual(validateRoute('/path?query'), false);
      assert.strictEqual(validateRoute('/path#hash'), false);
    });

    it('should handle non-string input', () => {
      assert.strictEqual(validateRoute(null), false);
      assert.strictEqual(validateRoute(123), false);
    });
  });

  describe('formatTestName', () => {
    it('should format test name from path', () => {
      const nodes = {
        home: { label: 'Home' },
        about: { label: 'About' },
      };
      const result = formatTestName(['home', 'about'], nodes);
      assert.strictEqual(result, 'Navigate from Home to About');
    });

    it('should handle special characters', () => {
      const nodes = {
        a: { label: 'Page (1)' },
        b: { label: 'Page [2]' },
      };
      const result = formatTestName(['a', 'b'], nodes);
      assert.strictEqual(result, 'Navigate from Page 1 to Page 2');
    });

    it('should handle empty path', () => {
      const result = formatTestName([], {});
      assert.strictEqual(result, 'Empty test');
    });
  });

  describe('deepClone', () => {
    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);
      assert.deepStrictEqual(cloned, obj);
      assert.notStrictEqual(cloned, obj);
      assert.notStrictEqual(cloned.b, obj.b);
    });

    it('should clone arrays', () => {
      const arr = [1, [2, 3], { a: 4 }];
      const cloned = deepClone(arr);
      assert.deepStrictEqual(cloned, arr);
      assert.notStrictEqual(cloned, arr);
    });

    it('should handle primitives', () => {
      assert.strictEqual(deepClone(42), 42);
      assert.strictEqual(deepClone('string'), 'string');
      assert.strictEqual(deepClone(null), null);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      assert.notStrictEqual(id1, id2);
    });

    it('should include prefix if provided', () => {
      const id = generateId('node');
      assert.ok(id.startsWith('node_'));
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      assert.strictEqual(formatFileSize(0), '0 B');
      assert.strictEqual(formatFileSize(512), '512.0 B');
    });

    it('should format kilobytes', () => {
      assert.strictEqual(formatFileSize(1024), '1.0 KB');
      assert.strictEqual(formatFileSize(2048), '2.0 KB');
    });

    it('should format megabytes', () => {
      assert.strictEqual(formatFileSize(1048576), '1.0 MB');
    });
  });

  describe('parseErrorMessage', () => {
    it('should parse Error objects', () => {
      const error = new Error('Test error');
      assert.strictEqual(parseErrorMessage(error), 'Test error');
    });

    it('should parse strings', () => {
      assert.strictEqual(parseErrorMessage('Error message'), 'Error message');
    });

    it('should parse objects with message', () => {
      assert.strictEqual(parseErrorMessage({ message: 'Object error' }), 'Object error');
    });

    it('should handle null/undefined', () => {
      assert.strictEqual(parseErrorMessage(null), 'Unknown error');
      assert.strictEqual(parseErrorMessage(undefined), 'Unknown error');
    });
  });
});
