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

// Legacy exports
export const helloWorldTemplate = exampleTemplate;
export const graphicsDemoTemplate = exampleTemplate;
