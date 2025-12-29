/**
 * Example project - The default project with graphics demo
 */
export const exampleTemplate = {
  name: 'Example',
  isSystemProject: true,
  files: {
    'main.c': `#include <gb/gb.h>
#include <gb/drawing.h>

void main(void) {
    UBYTE x, y, keys;

    // 1. Text (Graphical Font)
    // gprintf writes text to the bitmap layer, compatible with shapes
    gotogxy(3, 2);
    gprintf(" *** GB2GO ***");
    gotogxy(1, 3);
    gprintf("Shapes & Text Demo");

    // 2. Draw a border
    color(BLACK, WHITE, SOLID);
    box(0, 0, 159, 143, M_NOFILL);

    // 3. Draw some static shapes
    color(BLACK, BLACK, SOLID); // Needs fill color here
    box(10, 40, 40, 70, M_FILL);       // Filled Box
    circle(120, 55, 20, M_NOFILL);     // Circle
    color(BLACK, WHITE, SOLID); // Undo fill, otherwise text will be weird on the next frame
    // Triangle
    line(60, 70, 80, 40);
    line(80, 40, 100, 70);
    line(100, 70, 60, 70);

    // Separator
    line(0, 80, 159, 80);

    // Instructions
    gotogxy(2, 12);
    gprintf("Use D-Pad to move");
    gotogxy(2, 13);
    gprintf("the box below!");

    x = 80;
    y = 120;

    // Main Loop
    while(1) {
        keys = joypad();

        if (keys & J_UP)    y--;
        if (keys & J_DOWN)  y++;
        if (keys & J_LEFT)  x--;
        if (keys & J_RIGHT) x++;

        // Keep inside bounds
        if (x < 2) x = 2;
        if (x > 150) x = 150;
        if (y < 82) y = 82; // Stay below line
        if (y > 135) y = 135;

        // Draw a larger cursor so it's visible
        box(x, y, x+4, y+4, M_FILL);

        wait_vbl_done();
        delay(10);
    }
}
`,
  },
};

/**
 * Minimal starter template
 */
export const minimalTemplate = {
  name: 'Minimal',
  files: {
    'main.c': `#include <gb/gb.h>

void main(void) {
    // Your Game Boy program starts here!

    // Simple example: infinite loop
    while(1) {
        // Wait for vertical blank (vsync)
        wait_vbl_done();
    }
}
`,
  },
};

/**
 * Sprite example template - Demonstrates hardware sprites with inline data
 */
export const spriteTemplate = {
  name: 'Sprite Example',
  files: {
    'main.c': `#include <gb/gb.h>

// Simple 8x8 sprite - a smiley face
// Each pair of bytes represents one row (2 bits per pixel = 4 colors)
// You can also create sprites with the sprite editor (New Sprite button)
// and they'll be auto-converted from PNG at compile time!
const unsigned char player_tiles[] = {
    0x3C, 0x3C,  // ..####..
    0x42, 0x42,  // .#....#.
    0xA5, 0xA5,  // #.#..#.# (eyes)
    0x81, 0x81,  // #......#
    0xA5, 0xA5,  // #.#..#.# (mouth)
    0x99, 0x99,  // #..##..#
    0x42, 0x42,  // .#....#.
    0x3C, 0x3C   // ..####..
};

void main(void) {
    UINT8 x = 80, y = 72;

    // Load sprite tile data into VRAM (starting at tile 0)
    set_sprite_data(0, 1, player_tiles);

    // Set sprite 0 to use tile 0
    set_sprite_tile(0, 0);

    // Position sprite (add 8,16 offset - sprites are hidden if x<8 or y<16)
    move_sprite(0, x + 8, y + 16);

    // Make sprites visible
    SHOW_SPRITES;

    // Game loop
    while(1) {
        UINT8 keys = joypad();

        // Move with D-pad
        if (keys & J_UP)    y--;
        if (keys & J_DOWN)  y++;
        if (keys & J_LEFT)  x--;
        if (keys & J_RIGHT) x++;

        // Keep sprite on screen
        if (x < 1) x = 1;
        if (x > 160) x = 160;
        if (y < 1) y = 1;
        if (y > 144) y = 144;

        // Update sprite position
        move_sprite(0, x + 8, y + 16);

        wait_vbl_done();
    }
}
`,
  },
};

/**
 * Sprite PNG example template - Demonstrates the PNG to C workflow
 * The PNG file is generated dynamically when the project is created
 */
export const spritePngTemplate = {
  name: 'Sprite PNG Example',
  // PNG will be added dynamically by createSpriteExamplePng()
  files: {
    'main.c': `#include <gb/gb.h>
#include "sprites/player.h"  // Auto-generated from player.png at compile time

void main(void) {
    UINT8 x = 80, y = 72;

    // Load sprite tile data (generated from sprites/player.png)
    // The converter creates player_tiles[] and PLAYER_TILE_COUNT
    set_sprite_data(0, PLAYER_TILE_COUNT, player_tiles);

    // Set sprite 0 to use tile 0
    set_sprite_tile(0, 0);

    // Position sprite (add 8,16 offset - sprites are hidden if x<8 or y<16)
    move_sprite(0, x + 8, y + 16);

    // Make sprites visible
    SHOW_SPRITES;

    // Game loop - move sprite with D-pad
    while(1) {
        UINT8 keys = joypad();

        if (keys & J_UP)    y--;
        if (keys & J_DOWN)  y++;
        if (keys & J_LEFT)  x--;
        if (keys & J_RIGHT) x++;

        // Keep sprite on screen
        if (x < 1) x = 1;
        if (x > 160) x = 160;
        if (y < 1) y = 1;
        if (y > 144) y = 144;

        move_sprite(0, x + 8, y + 16);
        wait_vbl_done();
    }
}
`,
  },
};

/**
 * Generate a simple 8x8 smiley sprite PNG as a data URL
 * Uses the Game Boy DMG palette
 * @returns {string} PNG data URL
 */
export function createSpriteExamplePng() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');

  // Game Boy DMG palette
  const palette = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];

  // Smiley face pattern (0 = lightest, 3 = darkest)
  const pattern = [
    [0, 0, 3, 3, 3, 3, 0, 0], // ..####..
    [0, 3, 0, 0, 0, 0, 3, 0], // .#....#.
    [3, 0, 3, 0, 0, 3, 0, 3], // #.#..#.# (eyes)
    [3, 0, 0, 0, 0, 0, 0, 3], // #......#
    [3, 0, 3, 0, 0, 3, 0, 3], // #.#..#.# (mouth)
    [3, 0, 0, 3, 3, 0, 0, 3], // #..##..#
    [0, 3, 0, 0, 0, 0, 3, 0], // .#....#.
    [0, 0, 3, 3, 3, 3, 0, 0], // ..####..
  ];

  // Draw pixels
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = palette[pattern[y][x]];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas.toDataURL('image/png');
}

// Legacy exports
export const helloWorldTemplate = exampleTemplate;
export const graphicsDemoTemplate = exampleTemplate;
