#!/usr/bin/env node

/**
 * CLI entry point - Orchestrate scanner → graph → visualizer pipeline
 */

import fs from 'fs';
import path from 'path';
import { scanProject } from '../core/scanner.js';
import { buildGraph, validateGraph } from '../core/graph.js';
import { generateHTML } from '../core/visualizer.js';

/**
 * Main CLI function
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const sourceDir = args[0] || './demo/src';
  const outputFile = args[1] || 'flowchart.html';

  console.log('🔍 React Flowchart Generator');
  console.log('━'.repeat(40));

  // Validate source directory
  const absoluteSourceDir = path.resolve(sourceDir);
  if (!fs.existsSync(absoluteSourceDir)) {
    console.error(`❌ Error: Source directory not found: ${absoluteSourceDir}`);
    process.exit(1);
  }

  if (!fs.statSync(absoluteSourceDir).isDirectory()) {
    console.error(`❌ Error: Path is not a directory: ${absoluteSourceDir}`);
    process.exit(1);
  }

  console.log(`📁 Scanning: ${absoluteSourceDir}`);

  // Scan project
  const scanResult = scanProject(absoluteSourceDir);

  console.log(`📄 Files found: ${scanResult.files.length}`);
  console.log(`🛤️  Routes extracted: ${scanResult.routes.length}`);
  console.log(`🔗 Links extracted: ${scanResult.links.length}`);

  // Handle empty results
  if (scanResult.routes.length === 0) {
    console.warn('⚠️  Warning: No routes found in the project');
  }

  // Build graph
  const graph = buildGraph(scanResult);

  // Validate graph
  const warnings = validateGraph(graph);
  if (warnings.length > 0) {
    console.log('\n⚠️  Validation warnings:');
    for (const warning of warnings) {
      console.log(`   - ${warning}`);
    }
  }

  // Generate HTML
  const html = generateHTML(graph, {
    title: `Flowchart: ${path.basename(absoluteSourceDir)}`,
    timestamp: new Date().toISOString(),
  });

  // Write output file
  const absoluteOutputFile = path.resolve(outputFile);
  try {
    fs.writeFileSync(absoluteOutputFile, html);
    console.log('\n━'.repeat(40));
    console.log(`✅ Flowchart generated: ${absoluteOutputFile}`);
    console.log(`   Nodes: ${graph.nodes.size}`);
    console.log(`   Edges: ${graph.edges.length}`);
  } catch (error) {
    console.error(`❌ Error writing output file: ${error.message}`);
    process.exit(1);
  }
}

main();
