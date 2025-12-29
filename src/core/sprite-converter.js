/**
 * SpriteConverter - Convert images to Game Boy 2bpp format
 *
 * Handles conversion of PNG/ImageData to Game Boy tile format and generates
 * C source code for use with GBDK.
 *
 * Game Boy Tile Format (2bpp):
 * - Each tile is 8x8 pixels, 16 bytes total
 * - 2 bits per pixel = 4 colors (0-3)
 * - Stored as pairs of bytes per row: low bit plane, high bit plane
 * - Color 0 is typically transparent/lightest, Color 3 is darkest
 */

export class SpriteConverter {
  constructor() {
    // Default Game Boy DMG palette (green-ish)
    this.defaultPalettes = {
      dmg: ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'],
      gray: ['#ffffff', '#aaaaaa', '#555555', '#000000'],
      pocket: ['#c4cfa1', '#8b956d', '#4d533c', '#1f1f1f'],
    };
  }

  /**
   * Convert RGB color to hex string
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {string} Hex color string
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Convert hex color to RGB
   * @param {string} hex - Hex color string
   * @returns {{r: number, g: number, b: number}}
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * Calculate color distance (Euclidean in RGB space)
   * @param {object} c1 - First color {r, g, b}
   * @param {object} c2 - Second color {r, g, b}
   * @returns {number} Distance
   */
  colorDistance(c1, c2) {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
    );
  }

  /**
   * Calculate luminance of a color
   * @param {{r: number, g: number, b: number}} color
   * @returns {number} Luminance (0-255)
   */
  getLuminance(color) {
    return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
  }

  /**
   * Auto-detect palette from ImageData (extract up to 4 unique colors)
   * @param {ImageData} imageData - Image data
   * @returns {string[]} Array of 4 hex color strings, sorted light to dark
   */
  detectPalette(imageData) {
    const colors = new Map(); // hex -> count

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      // Skip fully transparent pixels
      if (a < 128) continue;

      const hex = this.rgbToHex(r, g, b);
      colors.set(hex, (colors.get(hex) || 0) + 1);
    }

    // Sort by frequency (most used first) and take top 4
    let palette = Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([hex]) => hex);

    // If less than 4 colors, pad with black/white
    while (palette.length < 4) {
      if (!palette.includes('#ffffff')) palette.push('#ffffff');
      else if (!palette.includes('#000000')) palette.push('#000000');
      else if (!palette.includes('#aaaaaa')) palette.push('#aaaaaa');
      else palette.push('#555555');
    }

    // Sort by luminance (lightest first = color 0)
    palette.sort((a, b) => {
      const lumA = this.getLuminance(this.hexToRgb(a));
      const lumB = this.getLuminance(this.hexToRgb(b));
      return lumB - lumA; // Descending (lightest first)
    });

    return palette;
  }

  /**
   * Map a pixel color to palette index (0-3)
   * @param {number} r - Red
   * @param {number} g - Green
   * @param {number} b - Blue
   * @param {number} a - Alpha
   * @param {string[]} palette - 4-color palette
   * @returns {number} Palette index (0-3)
   */
  mapColorToPaletteIndex(r, g, b, a, palette) {
    // Transparent pixels map to color 0 (typically transparent/lightest)
    if (a < 128) return 0;

    const pixelColor = { r, g, b };
    let minDist = Infinity;
    let bestIndex = 0;

    for (let i = 0; i < palette.length; i++) {
      const paletteColor = this.hexToRgb(palette[i]);
      const dist = this.colorDistance(pixelColor, paletteColor);
      if (dist < minDist) {
        minDist = dist;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * Convert a 2D array of palette indices (8x8) to Game Boy tile bytes
   * @param {number[][]} indices - 8x8 array of palette indices (0-3)
   * @returns {Uint8Array} 16 bytes of tile data
   */
  indicesToTileBytes(indices) {
    const bytes = new Uint8Array(16);

    for (let row = 0; row < 8; row++) {
      let lowByte = 0;
      let highByte = 0;

      for (let col = 0; col < 8; col++) {
        const index = indices[row][col];
        const bit = 7 - col; // MSB is leftmost pixel

        if (index & 1) lowByte |= 1 << bit;
        if (index & 2) highByte |= 1 << bit;
      }

      bytes[row * 2] = lowByte;
      bytes[row * 2 + 1] = highByte;
    }

    return bytes;
  }

  /**
   * Convert ImageData to Game Boy tiles
   * @param {ImageData} imageData - Source image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {string[]} palette - 4-color palette
   * @returns {{tiles: Uint8Array[], tileMap: number[][]}} Tiles and tilemap
   */
  imageToTiles(imageData, width, height, palette) {
    const tilesX = Math.ceil(width / 8);
    const tilesY = Math.ceil(height / 8);
    const tiles = [];
    const tileMap = [];

    for (let ty = 0; ty < tilesY; ty++) {
      const row = [];
      for (let tx = 0; tx < tilesX; tx++) {
        // Extract 8x8 tile
        const indices = [];
        for (let py = 0; py < 8; py++) {
          const rowIndices = [];
          for (let px = 0; px < 8; px++) {
            const x = tx * 8 + px;
            const y = ty * 8 + py;

            if (x < width && y < height) {
              const i = (y * width + x) * 4;
              const r = imageData.data[i];
              const g = imageData.data[i + 1];
              const b = imageData.data[i + 2];
              const a = imageData.data[i + 3];
              rowIndices.push(this.mapColorToPaletteIndex(r, g, b, a, palette));
            } else {
              rowIndices.push(0); // Pad with transparent
            }
          }
          indices.push(rowIndices);
        }

        const tileBytes = this.indicesToTileBytes(indices);
        tiles.push(tileBytes);
        row.push(tiles.length - 1);
      }
      tileMap.push(row);
    }

    return { tiles, tileMap };
  }

  /**
   * Deduplicate tiles, optionally detecting flipped versions
   * @param {Uint8Array[]} tiles - Array of tile data
   * @param {boolean} detectFlips - Whether to detect flipped tiles
   * @returns {{uniqueTiles: Uint8Array[], tileMap: object[]}} Unique tiles and mapping
   */
  deduplicateTiles(tiles, detectFlips = true) {
    const uniqueTiles = [];
    const tileHashes = new Map(); // hash -> { index, flipX, flipY }
    const tileMap = [];

    const hashTile = (tile) => {
      return Array.from(tile).join(',');
    };

    const flipTileX = (tile) => {
      const flipped = new Uint8Array(16);
      for (let row = 0; row < 8; row++) {
        let low = tile[row * 2];
        let high = tile[row * 2 + 1];
        // Reverse bits
        low =
          ((low & 0x01) << 7) |
          ((low & 0x02) << 5) |
          ((low & 0x04) << 3) |
          ((low & 0x08) << 1) |
          ((low & 0x10) >> 1) |
          ((low & 0x20) >> 3) |
          ((low & 0x40) >> 5) |
          ((low & 0x80) >> 7);
        high =
          ((high & 0x01) << 7) |
          ((high & 0x02) << 5) |
          ((high & 0x04) << 3) |
          ((high & 0x08) << 1) |
          ((high & 0x10) >> 1) |
          ((high & 0x20) >> 3) |
          ((high & 0x40) >> 5) |
          ((high & 0x80) >> 7);
        flipped[row * 2] = low;
        flipped[row * 2 + 1] = high;
      }
      return flipped;
    };

    const flipTileY = (tile) => {
      const flipped = new Uint8Array(16);
      for (let row = 0; row < 8; row++) {
        flipped[row * 2] = tile[(7 - row) * 2];
        flipped[row * 2 + 1] = tile[(7 - row) * 2 + 1];
      }
      return flipped;
    };

    for (const tile of tiles) {
      const hash = hashTile(tile);

      if (tileHashes.has(hash)) {
        tileMap.push(tileHashes.get(hash));
        continue;
      }

      // Check flipped versions
      if (detectFlips) {
        const flipXHash = hashTile(flipTileX(tile));
        if (tileHashes.has(flipXHash)) {
          const ref = tileHashes.get(flipXHash);
          tileMap.push({ index: ref.index, flipX: !ref.flipX, flipY: ref.flipY });
          continue;
        }

        const flipYHash = hashTile(flipTileY(tile));
        if (tileHashes.has(flipYHash)) {
          const ref = tileHashes.get(flipYHash);
          tileMap.push({ index: ref.index, flipX: ref.flipX, flipY: !ref.flipY });
          continue;
        }

        const flipXYHash = hashTile(flipTileX(flipTileY(tile)));
        if (tileHashes.has(flipXYHash)) {
          const ref = tileHashes.get(flipXYHash);
          tileMap.push({ index: ref.index, flipX: !ref.flipX, flipY: !ref.flipY });
          continue;
        }
      }

      // New unique tile
      const newIndex = uniqueTiles.length;
      uniqueTiles.push(tile);
      const entry = { index: newIndex, flipX: false, flipY: false };
      tileHashes.set(hash, entry);
      tileMap.push(entry);
    }

    return { uniqueTiles, tileMap };
  }

  /**
   * Generate C source code for sprite tiles
   * @param {string} name - Variable name
   * @param {Uint8Array[]} tiles - Tile data arrays
   * @param {object} options - Generation options
   * @returns {string} C source code
   */
  generateCSpriteData(name, tiles, options = {}) {
    const { includeHeader = true, bytesPerLine = 16 } = options;

    let code = '';

    if (includeHeader) {
      code += `// ${name}.c - Generated by GB2Go\n`;
      code += `#include <gb/gb.h>\n\n`;
    }

    // Tile data
    code += `const UINT8 ${name}_tiles[] = {\n`;

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      code += `    // Tile ${i}\n    `;

      for (let j = 0; j < tile.length; j++) {
        code += `0x${tile[j].toString(16).padStart(2, '0')}`;
        if (j < tile.length - 1 || i < tiles.length - 1) code += ',';
        if ((j + 1) % bytesPerLine === 0 && j < tile.length - 1) code += '\n    ';
      }
      code += '\n';
    }

    code += `};\n\n`;
    code += `#define ${name.toUpperCase()}_TILE_COUNT ${tiles.length}\n`;

    return code;
  }

  /**
   * Generate C metasprite code for a sprite larger than 8x8
   * @param {string} name - Variable name
   * @param {Uint8Array[]} tiles - Tile data
   * @param {number} width - Sprite width in pixels
   * @param {number} height - Sprite height in pixels
   * @param {object} options - Generation options
   * @returns {string} C source code including metasprite definitions
   */
  generateMetasprite(name, tiles, width, height, options = {}) {
    const { spriteMode = '8x16', baseTileIndex = 0 } = options;

    const tilesX = Math.ceil(width / 8);
    const tilesY = Math.ceil(height / 8);

    let code = this.generateCSpriteData(name, tiles, options);

    // Include metasprites header
    code = code.replace('#include <gb/gb.h>', '#include <gb/gb.h>\n#include <gb/metasprites.h>');

    // Generate metasprite definition
    code += `\n// Metasprite definition for ${width}x${height} sprite\n`;
    code += `const metasprite_t ${name}_metasprite[] = {\n`;

    const originX = Math.floor(width / 2);
    const originY = Math.floor(height / 2);

    let tileIndex = baseTileIndex;
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const x = tx * 8 - originX;
        const y = ty * 8 - originY;
        code += `    METASPR_ITEM(${y}, ${x}, ${tileIndex}, 0),\n`;
        tileIndex++;
      }
    }

    code += `    METASPR_TERM\n`;
    code += `};\n\n`;

    code += `const metasprite_t* const ${name}_metasprites[1] = {\n`;
    code += `    ${name}_metasprite\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generate C header file for sprite data
   * @param {string} name - Variable name
   * @param {number} tileCount - Number of tiles
   * @param {boolean} hasMetasprite - Whether metasprite is included
   * @returns {string} C header code
   */
  generateHeader(name, tileCount, hasMetasprite = false) {
    const guard = `${name.toUpperCase()}_H`;

    let code = `// ${name}.h - Generated by GB2Go\n`;
    code += `#ifndef ${guard}\n`;
    code += `#define ${guard}\n\n`;
    code += `#include <gb/gb.h>\n`;

    if (hasMetasprite) {
      code += `#include <gb/metasprites.h>\n`;
    }

    code += `\n`;
    code += `extern const UINT8 ${name}_tiles[];\n`;
    code += `#define ${name.toUpperCase()}_TILE_COUNT ${tileCount}\n`;

    if (hasMetasprite) {
      code += `\nextern const metasprite_t* const ${name}_metasprites[];\n`;
    }

    code += `\n#endif // ${guard}\n`;

    return code;
  }

  /**
   * Convert a 2D pixel array (palette indices) to PNG Blob
   * @param {number[][]} pixels - 2D array of palette indices
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   * @param {string[]} palette - 4-color hex palette
   * @returns {Promise<Blob>} PNG blob
   */
  async pixelsToPNG(pixels, width, height, palette) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = pixels[y]?.[x] ?? 0;
        const color = this.hexToRgb(palette[index] || '#000000');
        const i = (y * width + x) * 4;

        imageData.data[i] = color.r;
        imageData.data[i + 1] = color.g;
        imageData.data[i + 2] = color.b;
        imageData.data[i + 3] = index === 0 ? 0 : 255; // Color 0 is transparent
      }
    }

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
  }

  /**
   * Full conversion pipeline: ImageData -> tiles + C code
   * @param {ImageData} imageData - Source image
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {string} name - Variable name for generated code
   * @param {object} options - Conversion options
   * @returns {{tiles: Uint8Array[], cCode: string, hCode: string, palette: string[]}}
   */
  convert(imageData, width, height, name, options = {}) {
    const {
      palette = null,
      deduplicate = true,
      detectFlips = true,
      generateMetasprite = width > 8 || height > 8,
    } = options;

    // Auto-detect or use provided palette
    const usedPalette = palette || this.detectPalette(imageData);

    // Convert to tiles
    let { tiles } = this.imageToTiles(imageData, width, height, usedPalette);

    // Optionally deduplicate
    if (deduplicate) {
      const result = this.deduplicateTiles(tiles, detectFlips);
      tiles = result.uniqueTiles;
    }

    // Generate C code
    let cCode;
    if (generateMetasprite) {
      cCode = this.generateMetasprite(name, tiles, width, height, options);
    } else {
      cCode = this.generateCSpriteData(name, tiles, options);
    }

    // Generate header
    const hCode = this.generateHeader(name, tiles.length, generateMetasprite);

    return {
      tiles,
      cCode,
      hCode,
      palette: usedPalette,
    };
  }
}
