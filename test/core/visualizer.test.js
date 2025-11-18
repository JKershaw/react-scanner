/**
 * Visualizer module tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateMermaidSyntax, generateHTML } from '../../src/core/visualizer.js';

describe('Visualizer', () => {
  describe('generateMermaidSyntax', () => {
    it('should generate valid syntax for empty graph', () => {
      const graph = { nodes: new Map(), edges: [] };
      const syntax = generateMermaidSyntax(graph);
      assert.ok(syntax.includes('graph TD'));
    });

    it('should generate node definitions', () => {
      const graph = {
        nodes: new Map([
          ['root', { id: 'root', label: '/ (Home)', type: 'page', component: 'Home' }],
        ]),
        edges: [],
      };

      const syntax = generateMermaidSyntax(graph);
      assert.ok(syntax.includes('root'));
      assert.ok(syntax.includes('/ (Home)'));
    });

    it('should generate edges with arrows', () => {
      const graph = {
        nodes: new Map([
          ['root', { id: 'root', label: '/ (Home)', type: 'page', component: 'Home' }],
          ['about', { id: 'about', label: '/about (About)', type: 'page', component: 'About' }],
        ]),
        edges: [{ from: 'root', to: 'about', label: 'Link', type: 'Link' }],
      };

      const syntax = generateMermaidSyntax(graph);
      assert.ok(syntax.includes('root -->'));
      assert.ok(syntax.includes('about'));
    });

    it('should use different shapes for node types', () => {
      const graph = {
        nodes: new Map([
          ['error', { id: 'error', label: '* (NotFound)', type: 'error', component: 'NotFound' }],
          ['auth', { id: 'auth', label: '/login (Login)', type: 'auth', component: 'Login' }],
          ['dashboard', { id: 'dashboard', label: '/dashboard (Dashboard)', type: 'dashboard', component: 'Dashboard' }],
        ]),
        edges: [],
      };

      const syntax = generateMermaidSyntax(graph);
      // Error nodes use diamond shape {{}}
      assert.ok(syntax.includes('{{'));
      // Auth nodes use stadium shape ([])
      assert.ok(syntax.includes('(['));
      // Dashboard nodes use subroutine shape [[]]
      assert.ok(syntax.includes('[['));
    });

    it('should include class definitions', () => {
      const graph = {
        nodes: new Map([
          ['error', { id: 'error', label: '* (NotFound)', type: 'error', component: 'NotFound' }],
        ]),
        edges: [],
      };

      const syntax = generateMermaidSyntax(graph);
      assert.ok(syntax.includes('classDef error'));
      assert.ok(syntax.includes('class error error'));
    });
  });

  describe('generateHTML', () => {
    const sampleGraph = {
      nodes: new Map([
        ['root', { id: 'root', label: '/ (Home)', type: 'page', component: 'Home' }],
        ['about', { id: 'about', label: '/about (About)', type: 'page', component: 'About' }],
      ]),
      edges: [{ from: 'root', to: 'about', label: 'Link', type: 'Link' }],
    };

    it('should generate valid HTML document', () => {
      const html = generateHTML(sampleGraph);
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('<html'));
      assert.ok(html.includes('</html>'));
    });

    it('should include Mermaid CDN script', () => {
      const html = generateHTML(sampleGraph);
      assert.ok(html.includes('mermaid'));
      assert.ok(html.includes('cdn.jsdelivr.net'));
    });

    it('should include graph statistics', () => {
      const html = generateHTML(sampleGraph);
      // Should show node and edge counts
      assert.ok(html.includes('2')); // nodes
      assert.ok(html.includes('1')); // edges
    });

    it('should include timestamp', () => {
      const html = generateHTML(sampleGraph, { timestamp: '2024-01-01T00:00:00.000Z' });
      assert.ok(html.includes('2024-01-01'));
    });

    it('should include custom title', () => {
      const html = generateHTML(sampleGraph, { title: 'Custom Title' });
      assert.ok(html.includes('Custom Title'));
    });

    it('should include Mermaid syntax', () => {
      const html = generateHTML(sampleGraph);
      assert.ok(html.includes('graph TD'));
      assert.ok(html.includes('root'));
      assert.ok(html.includes('about'));
    });

    it('should include styling', () => {
      const html = generateHTML(sampleGraph);
      assert.ok(html.includes('<style>'));
      assert.ok(html.includes('</style>'));
    });

    it('should include legend', () => {
      const html = generateHTML(sampleGraph);
      assert.ok(html.includes('legend'));
      assert.ok(html.includes('Regular Page'));
      assert.ok(html.includes('Error Page'));
    });
  });
});
