#!/usr/bin/env node

/**
 * extract-resources.js
 *
 * Extracts GBDK header files (.h) and library files (.lib) from gbdk-emscripten
 * and bundles them into JSON files for use in the virtual filesystem.
 *
 * Output:
 * - ../lib/resources/headers.json - All GBDK header files
 * - ../lib/resources/libraries.json - All GBDK library files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import globPkg from 'glob';
const { glob } = globPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const GBDK_DIR = path.join(__dirname, 'node_modules', 'gbdk-emscripten', 'dist', 'gbdk');
const OUTPUT_DIR = path.join(__dirname, '..', 'lib', 'resources');

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Extract all header files and bundle them into JSON
 */
function extractHeaders() {
  console.log('\nExtracting header files...');

  const includeDir = path.join(GBDK_DIR, 'include');
  const headerFiles = glob.sync('**/*.h', { cwd: includeDir });

  const headers = {};
  let totalSize = 0;

  for (const file of headerFiles) {
    const fullPath = path.join(includeDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Store with forward slashes for cross-platform compatibility
    const normalizedPath = file.replace(/\\/g, '/');
    headers[normalizedPath] = content;

    totalSize += content.length;
    console.log(`  ✓ ${normalizedPath} (${content.length} bytes)`);
  }

  const outputPath = path.join(OUTPUT_DIR, 'headers.json');
  fs.writeFileSync(outputPath, JSON.stringify(headers, null, 2), 'utf-8');

  const outputStats = fs.statSync(outputPath);
  const outputSizeKB = (outputStats.size / 1024).toFixed(2);

  console.log(`\n✓ Bundled ${Object.keys(headers).length} header files`);
  console.log(`  Total content size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`  Output file: ${outputSizeKB} KB`);

  return Object.keys(headers).length;
}

/**
 * Extract all library files and bundle them into JSON
 */
function extractLibraries() {
  console.log('\nExtracting library files...');

  const libDir = path.join(GBDK_DIR, 'lib');
  const libFiles = glob.sync('**/*.{lib,o}', { cwd: libDir });

  const libraries = {};
  let totalSize = 0;

  for (const file of libFiles) {
    const fullPath = path.join(libDir, file);
    const content = fs.readFileSync(fullPath);

    // Store as base64 since .lib files are binary
    const normalizedPath = file.replace(/\\/g, '/');
    libraries[normalizedPath] = content.toString('base64');

    totalSize += content.length;
    console.log(`  ✓ ${normalizedPath} (${content.length} bytes)`);
  }

  const outputPath = path.join(OUTPUT_DIR, 'libraries.json');
  fs.writeFileSync(outputPath, JSON.stringify(libraries, null, 2), 'utf-8');

  const outputStats = fs.statSync(outputPath);
  const outputSizeKB = (outputStats.size / 1024).toFixed(2);

  console.log(`\n✓ Bundled ${Object.keys(libraries).length} library files`);
  console.log(`  Total content size: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`  Output file: ${outputSizeKB} KB`);

  return Object.keys(libraries).length;
}

/**
 * Main extraction process
 */
function main() {
  console.log('=== GBDK Resources Extraction ===\n');
  console.log(`Source: ${GBDK_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Ensure output directory exists
  ensureOutputDir();

  try {
    // Extract headers
    const headerCount = extractHeaders();

    // Extract libraries
    const libCount = extractLibraries();

    // Summary
    console.log('\n=== Extraction Summary ===');
    console.log(`Headers extracted: ${headerCount}`);
    console.log(`Libraries extracted: ${libCount}`);
    console.log('\n✓ All resources extracted successfully!');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error during extraction:', error);
    process.exit(1);
  }
}

// Run main function
main();
