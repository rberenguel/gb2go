#!/usr/bin/env node

/**
 * extract-wasm.js
 *
 * Extracts WASM modules and JavaScript glue code from gbdk-emscripten
 * and copies them to ../lib/wasm/ for use in the browser-based IDE.
 *
 * The extracted modules include:
 * - sdcc: SDCC C compiler
 * - sdcpp: SDCC preprocessor
 * - as-gbz80: Game Boy Z80 assembler
 * - link-gbz80: Game Boy Z80 linker
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const GBDK_DIR = path.join(__dirname, 'node_modules', 'gbdk-emscripten', 'dist', 'gbdk');
const OUTPUT_DIR = path.join(__dirname, '..', 'lib', 'wasm');

// Modules to extract
const MODULES = [
  { name: 'sdcc', description: 'SDCC C Compiler' },
  { name: 'sdcpp', description: 'SDCC Preprocessor' },
  { name: 'as-gbz80', description: 'Game Boy Z80 Assembler' },
  { name: 'link-gbz80', description: 'Game Boy Z80 Linker' },
  { name: 'makebin', description: 'ROM Converter' }
];

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
 * Copy a file from source to destination
 */
function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
  const stats = fs.statSync(dest);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`  ✓ Copied ${path.basename(dest)} (${sizeKB} KB)`);
}

/**
 * Modify JS glue code to work better in browser
 * This is optional - the files should already work in browsers,
 * but we can add optimizations here if needed.
 */
function modifyGlueCode(content, moduleName) {
  // The Emscripten glue code already detects browser environments
  // We can add any browser-specific modifications here if needed

  // For now, just return the content as-is since it already supports browsers
  return content;
}

/**
 * Extract a single module
 */
function extractModule(module) {
  console.log(`\nExtracting ${module.description}...`);

  const wasmFile = `${module.name}.wasm`;
  const jsFile = `${module.name}.js`;

  const wasmSrc = path.join(GBDK_DIR, wasmFile);
  const jsSrc = path.join(GBDK_DIR, jsFile);

  const wasmDest = path.join(OUTPUT_DIR, wasmFile);
  const jsDest = path.join(OUTPUT_DIR, jsFile);

  // Check if source files exist
  if (!fs.existsSync(wasmSrc)) {
    console.error(`  ✗ WASM file not found: ${wasmSrc}`);
    return false;
  }

  if (!fs.existsSync(jsSrc)) {
    console.error(`  ✗ JS file not found: ${jsSrc}`);
    return false;
  }

  // Copy WASM file
  copyFile(wasmSrc, wasmDest);

  // Copy and optionally modify JS glue code
  const jsContent = fs.readFileSync(jsSrc, 'utf-8');
  const modifiedContent = modifyGlueCode(jsContent, module.name);
  fs.writeFileSync(jsDest, modifiedContent, 'utf-8');
  const stats = fs.statSync(jsDest);
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`  ✓ Copied ${path.basename(jsDest)} (${sizeKB} KB)`);

  return true;
}

/**
 * Main extraction process
 */
function main() {
  console.log('=== GBDK WASM Extraction ===\n');
  console.log(`Source: ${GBDK_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Ensure output directory exists
  ensureOutputDir();

  // Extract each module
  let successCount = 0;
  for (const module of MODULES) {
    if (extractModule(module)) {
      successCount++;
    }
  }

  // Summary
  console.log('\n=== Extraction Summary ===');
  console.log(`Successfully extracted: ${successCount}/${MODULES.length} modules`);

  if (successCount === MODULES.length) {
    console.log('\n✓ All WASM modules extracted successfully!');
    process.exit(0);
  } else {
    console.error('\n✗ Some modules failed to extract');
    process.exit(1);
  }
}

// Run main function
main();
