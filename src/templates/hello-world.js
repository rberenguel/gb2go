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
 * Flappy Duck - A complete game demonstrating PNG sprite workflow
 * PNG files are loaded from src/templates/sprites/
 */
export const spritePngTemplate = {
  name: 'Flappy Duck',
  files: {
    'main.c': `#include <gb/gb.h>
#include <gb/font.h>
#include <gb/console.h>
#include <stdio.h>
#include "sprites/duck1.h"  // Duck frame 1
#include "sprites/duck2.h"  // Duck frame 2
#include "sprites/pipe.h"   // Pipe segment

// Game constants
#define GRAVITY 1
#define FLAP_STRENGTH 7
#define PIPE_SPEED 1
#define PIPE_GAP 48
#define DUCK_X 30
#define PIPES_PER_SIDE 8

// Game states
#define STATE_TITLE 0
#define STATE_PLAYING 1
#define STATE_GAMEOVER 2

// Game state
UINT8 game_state;
INT16 duck_y;        // Duck Y position (fixed point, /16 for actual)
INT8 duck_vel;       // Duck velocity
UINT8 duck_frame;    // Animation frame (0 or 1)
UINT8 frame_count;   // Frame counter for animation

// Pipe state (2 pipes on screen)
INT16 pipe_x[2];     // Pipe X positions
UINT8 pipe_gap_y[2]; // Y position of gap center

UINT8 score;

// Tile indices for sprites
#define TILE_DUCK1 0
#define TILE_DUCK2 1
#define TILE_PIPE 2

// Simple random number generator
UINT8 rand_seed;
UINT8 next_rand(void) {
    rand_seed = (rand_seed * 13 + 7) & 0xFF;
    return rand_seed;
}

void hide_all_sprites(void) {
    UINT8 i;
    for (i = 0; i < 40; i++) {
        move_sprite(i, 0, 0);
    }
}

void clear_background(void) {
    UINT8 blank[1] = {0};
    UINT8 x, y;
    // Fill background with blank tiles
    for (y = 0; y < 18; y++) {
        for (x = 0; x < 20; x++) {
            set_bkg_tiles(x, y, 1, 1, blank);
        }
    }
}

void show_title(void) {
    clear_background();
    gotoxy(4, 6);
    printf("FLAPPY DUCK");
    gotoxy(3, 10);
    printf("PRESS START");
    SHOW_BKG;
}

void show_game_over(void) {
    clear_background();
    gotoxy(4, 8);
    printf("GAME OVER!");
    gotoxy(5, 10);
    printf("SCORE: %d", score);
    gotoxy(3, 14);
    printf("PRESS START");
    SHOW_BKG;
}

void start_gameplay(void) {
    clear_background();
    gotoxy(0, 0);
    printf("0");
    SHOW_BKG;
}

void update_score_display(UINT8 old_score) {
    if (score != old_score) {
        gotoxy(0, 0);
        printf("%d ", score);  // Extra space clears old digit
    }
}

void init_pipe(UINT8 i, INT16 x) {
    pipe_x[i] = x;
    // Random gap position (between 50 and 94) - more centered
    pipe_gap_y[i] = 50 + (next_rand() % 44);
}

void draw_pipe(UINT8 pipe_idx, UINT8 sprite_base) {
    INT16 x = pipe_x[pipe_idx];
    INT16 gap_y = pipe_gap_y[pipe_idx];
    UINT8 i;
    INT16 py;

    // Hide all pipe sprites if off-screen
    if (x < -8 || x > 168) {
        for (i = 0; i < PIPES_PER_SIDE * 2; i++) {
            move_sprite(sprite_base + i, 0, 0);
        }
        return;
    }

    // Draw top pipe (8 sprites from top of screen down to gap)
    for (i = 0; i < PIPES_PER_SIDE; i++) {
        py = gap_y - PIPE_GAP/2 - 8 - (i * 8);
        if (py > -8 && py < 160) {
            move_sprite(sprite_base + i, x + 8, py + 16);
        } else {
            move_sprite(sprite_base + i, 0, 0);
        }
    }

    // Draw bottom pipe (8 sprites from gap down to bottom)
    for (i = 0; i < PIPES_PER_SIDE; i++) {
        py = gap_y + PIPE_GAP/2 + (i * 8);
        if (py > -8 && py < 160) {
            move_sprite(sprite_base + PIPES_PER_SIDE + i, x + 8, py + 16);
        } else {
            move_sprite(sprite_base + PIPES_PER_SIDE + i, 0, 0);
        }
    }
}

UINT8 check_collision(void) {
    UINT8 dy = duck_y >> 4;  // Convert from fixed point
    UINT8 i;

    // Check floor only (ceiling is ok)
    if (dy > 136) return 1;

    // Check pipe collision
    for (i = 0; i < 2; i++) {
        INT16 px = pipe_x[i];

        // Check if duck is horizontally aligned with pipe
        if (DUCK_X + 5 > px && DUCK_X < px + 8) {
            UINT8 gap_y = pipe_gap_y[i];
            // Check if duck is outside the gap
            if (dy < gap_y - PIPE_GAP/2 + 2 || dy + 5 > gap_y + PIPE_GAP/2 - 2) {
                return 1;
            }
        }
    }
    return 0;
}

void reset_game(void) {
    duck_y = 72 << 4;  // Center of screen (fixed point)
    duck_vel = 0;
    score = 0;
    duck_frame = 0;
    frame_count = 0;

    init_pipe(0, 180);
    init_pipe(1, 280);
}

void main(void) {
    UINT8 keys, prev_keys = 0;
    UINT8 i;

    // Initialize random seed
    rand_seed = 42;

    // Initialize font for text display (loads into BKG tiles)
    font_init();
    font_set(font_load(font_spect));

    // Load sprite tile data (into sprite VRAM, separate from BKG)
    set_sprite_data(TILE_DUCK1, 1, duck1_tiles);
    set_sprite_data(TILE_DUCK2, 1, duck2_tiles);
    set_sprite_data(TILE_PIPE, 1, pipe_tiles);

    // Set up duck sprite (sprite 0)
    set_sprite_tile(0, TILE_DUCK1);

    // Set up pipe sprites (sprites 1-32, 16 per pipe)
    for (i = 0; i < PIPES_PER_SIDE * 4; i++) {
        set_sprite_tile(1 + i, TILE_PIPE);
    }

    // Hide all sprites initially
    hide_all_sprites();

    SHOW_SPRITES;

    // Start at title screen
    game_state = STATE_TITLE;
    show_title();

    // Show duck in center for title
    move_sprite(0, 80 + 8, 72 + 16);

    // Game loop
    while(1) {
        keys = joypad();

        switch (game_state) {
            case STATE_TITLE:
                // Animate duck on title
                frame_count++;
                if (frame_count >= 10) {
                    frame_count = 0;
                    duck_frame = !duck_frame;
                    set_sprite_tile(0, duck_frame ? TILE_DUCK2 : TILE_DUCK1);
                }

                // Vary random seed while waiting
                rand_seed++;

                // Start game on START or A button
                if (((keys & J_START) || (keys & J_A)) &&
                    !((prev_keys & J_START) || (prev_keys & J_A))) {
                    hide_all_sprites();
                    reset_game();
                    start_gameplay();
                    game_state = STATE_PLAYING;
                }
                break;

            case STATE_PLAYING:
                {
                UINT8 old_score = score;
                UINT8 other_pipe;
                INT16 new_pipe_x;

                // A button to flap
                if ((keys & J_A) && !(prev_keys & J_A)) {
                    duck_vel = -FLAP_STRENGTH;
                }

                // Apply gravity
                duck_vel += GRAVITY;
                if (duck_vel > 8) duck_vel = 8;

                duck_y += duck_vel << 2;

                // Keep duck on screen (top)
                if (duck_y < 0) {
                    duck_y = 0;
                    duck_vel = 0;
                }

                // Update pipes
                for (i = 0; i < 2; i++) {
                    pipe_x[i] -= PIPE_SPEED;

                    // Score when passing pipe
                    if (pipe_x[i] == DUCK_X - PIPE_SPEED) {
                        score++;
                        if (score > 99) score = 99;
                    }

                    // Reset pipe when off screen - place after the other pipe
                    if (pipe_x[i] < -16) {
                        other_pipe = (i == 0) ? 1 : 0;
                        new_pipe_x = pipe_x[other_pipe] + 80 + (next_rand() & 0x1F);
                        if (new_pipe_x < 168) new_pipe_x = 168;
                        init_pipe(i, new_pipe_x);
                    }
                }

                // Update score display if changed
                update_score_display(old_score);

                // Check collision
                if (check_collision()) {
                    show_game_over();
                    game_state = STATE_GAMEOVER;
                }

                // Animate duck
                frame_count++;
                if (frame_count >= 8) {
                    frame_count = 0;
                    duck_frame = !duck_frame;
                    set_sprite_tile(0, duck_frame ? TILE_DUCK2 : TILE_DUCK1);
                }

                // Draw duck
                move_sprite(0, DUCK_X + 8, (duck_y >> 4) + 16);

                // Draw pipes
                draw_pipe(0, 1);
                draw_pipe(1, 1 + PIPES_PER_SIDE * 2);
                }
                break;

            case STATE_GAMEOVER:
                // Restart on START or A
                if (((keys & J_START) || (keys & J_A)) &&
                    !((prev_keys & J_START) || (prev_keys & J_A))) {
                    hide_all_sprites();
                    reset_game();
                    start_gameplay();
                    game_state = STATE_PLAYING;
                }
                break;
        }

        prev_keys = keys;
        wait_vbl_done();
    }
}
`,
  },
};

/**
 * Generate rubber duck sprite frame 1 (normal)
 * Side-view rubber duck facing right, like a bath toy
 * @returns {string} PNG data URL (8x8)
 */
export function createDuck1SpritePng() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');

  // Game Boy DMG palette (0=lightest/bg to 3=darkest)
  const palette = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];

  // Rubber duck facing RIGHT - classic bath toy look
  // 0=bg, 1=yellow body, 2=orange beak, 3=dark eye/outline
  const pattern = [
    [0, 0, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 3, 1, 2, 2],
    [0, 1, 1, 1, 1, 1, 2, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = palette[pattern[y][x]];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generate rubber duck sprite frame 2 (bobbing/flapping)
 * Same duck but shifted down 1px for bobbing animation
 * @returns {string} PNG data URL (8x8)
 */
export function createDuck2SpritePng() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');

  // Game Boy DMG palette
  const palette = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];

  // Same duck, shifted down 1 pixel for bobbing effect
  const pattern = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 3, 1, 2, 2],
    [0, 1, 1, 1, 1, 1, 2, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 1, 1, 0, 0, 0],
  ];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = palette[pattern[y][x]];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generate pipe sprite (solid green block)
 * @returns {string} PNG data URL (8x8)
 */
export function createPipeSpritePng() {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');

  // Game Boy DMG palette
  const palette = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];

  // Pipe pattern - solid with edge highlight
  const pattern = [
    [2, 2, 2, 2, 2, 2, 2, 3],
    [2, 2, 2, 2, 2, 2, 2, 3],
    [2, 2, 2, 2, 2, 2, 2, 3],
    [2, 2, 2, 2, 2, 2, 2, 3],
    [2, 2, 2, 2, 2, 2, 2, 3],
    [2, 2, 2, 2, 2, 2, 2, 3],
    [2, 2, 2, 2, 2, 2, 2, 3],
    [3, 3, 3, 3, 3, 3, 3, 3],
  ];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = palette[pattern[y][x]];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Legacy function for backwards compatibility
 */
export function createSpriteExamplePng() {
  return createDuck1SpritePng();
}

// Legacy exports
export const helloWorldTemplate = exampleTemplate;
export const graphicsDemoTemplate = exampleTemplate;
