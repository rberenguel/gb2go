/**
 * Default "Hello World" project template for Game Boy
 */

export const helloWorldTemplate = {
  name: 'Hello World',
  files: {
    'main.c': `#include <gb/gb.h>
#include <stdio.h>

void main(void) {
    printf("Hello GB2GO!");
    printf("Game Boy Dev");

    waitpad(J_START);

    while(1) {
        wait_vbl_done();
    }
}
`
  }
};
