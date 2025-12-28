/**
 * Default "Hello World" project template for Game Boy
 */

export const helloWorldTemplate = {
  name: 'Hello World',
  files: {
    'main.c': `#include <gb/gb.h>
#include <stdio.h>
#include <gb/console.h>

void main(void) {
    UBYTE x = 10;
    UBYTE y = 8;
    UBYTE keys;

    // Use standard font
    printf("\\n   *** GB2GO ***\\n");
    printf("  Game Boy IDE Demo\\n");
    printf("\\n  Use D-Pad to move\\n");
    printf("    the smiley :)\\n");

    // Draw a border
    gotoxy(0, 16);
    printf("____________________");

    // Main Loop
    while(1) {
        // Read joypad
        keys = joypad();

        // Clear old position (overwrite with space)
        gotoxy(x, y);
        setchar(' ');

        // Update position based on input
        if (keys & J_UP)    y--;
        if (keys & J_DOWN)  y++;
        if (keys & J_LEFT)  x--;
        if (keys & J_RIGHT) x++;

        // Keep inside bounds (approx 20x18 chars)
        if (x < 1) x = 1;
        if (x > 18) x = 18;
        if (y < 6) y = 6;
        if (y > 15) y = 15;

        // Draw new position (smiley face char 1)
        gotoxy(x, y);
        setchar(0x01); // 0x01 is often a smiley in default font

        // Wait for VBlank (60 FPS sync)
        wait_vbl_done();
        
        // Simple delay to make movement controllable
        delay(50);
    }
}
`
  }
};
