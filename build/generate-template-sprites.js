#!/usr/bin/env node

/**
 * Generate template sprite PNGs for Flappy Duck
 *
 * This creates the default duck and pipe sprites as actual PNG files
 * that can be edited with any image editor.
 *
 * Run: node build/generate-template-sprites.js
 *
 * Output files (8x8 PNGs using Game Boy DMG palette):
 *   - src/templates/sprites/duck1.png
 *   - src/templates/sprites/duck2.png
 *   - src/templates/sprites/pipe.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'templates', 'sprites');

// Game Boy DMG palette
const PALETTE = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];

function createSpritePng(pattern, filename) {
  const canvas = createCanvas(8, 8);
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = PALETTE[pattern[y][x]];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const outputPath = path.join(OUTPUT_DIR, filename);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Created ${filename}`);
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Duck frame 1 - facing right
const duck1 = [
  [0, 0, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 3, 1, 2, 2],
  [0, 1, 1, 1, 1, 1, 2, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

// Duck frame 2 - bobbing (shifted down)
const duck2 = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 3, 1, 2, 2],
  [0, 1, 1, 1, 1, 1, 2, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

// Pipe segment
const pipe = [
  [2, 2, 2, 2, 2, 2, 2, 3],
  [2, 2, 2, 2, 2, 2, 2, 3],
  [2, 2, 2, 2, 2, 2, 2, 3],
  [2, 2, 2, 2, 2, 2, 2, 3],
  [2, 2, 2, 2, 2, 2, 2, 3],
  [2, 2, 2, 2, 2, 2, 2, 3],
  [2, 2, 2, 2, 2, 2, 2, 3],
  [3, 3, 3, 3, 3, 3, 3, 3],
];

console.log('Generating template sprites...\n');

createSpritePng(duck1, 'duck1.png');
createSpritePng(duck2, 'duck2.png');
createSpritePng(pipe, 'pipe.png');

console.log('\nDone! Edit these files with any image editor.');
console.log('Use the Game Boy palette: #9bbc0f, #8bac0f, #306230, #0f380f');
