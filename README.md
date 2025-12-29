# GB2GO - Browser-based Game Boy IDE

**GB2GO** is a zero-setup, in-browser Integrated Development Environment (IDE) for creating Game Boy games using C and GBDK-2020.

No installation required - everything runs in your browser.

## Features

### Development Tools
- **Code Editor**: CodeMirror 6 with C syntax highlighting, search (Cmd+F), undo/redo
- **GBDK Compiler**: Full GBDK-2020/SDCC toolchain compiled to WebAssembly
- **Instant Preview**: Binjgb emulator runs your ROM immediately after compilation
- **Touch Controls**: Virtual D-pad and buttons for testing on iPad/tablets

### Project Management
- **Multiple Projects**: Create, switch, rename, and delete projects
- **File Browser**: Organize code with multiple .c and .h files
- **Auto-Save**: Changes saved automatically to IndexedDB
- **Import/Export**: ZIP archive support for backup and sharing

### Asset Pipeline
- **PNG Sprites**: Drop PNG files into your project, automatically converted to C at compile time
- **4-Color Palette**: Game Boy DMG palette support (#9bbc0f, #8bac0f, #306230, #0f380f)
- **8x8 Tiles**: Standard Game Boy tile format

### Templates
- **Example**: Graphics demo with shapes and text
- **Minimal**: Basic starter template
- **Sprite**: Inline sprite data demonstration
- **Flappy Duck**: Complete game showcasing PNG sprite workflow

## Quick Start

1. Open GB2GO in a modern browser (Chrome, Firefox, Safari, Edge)
2. Select a project template or start with the Example
3. Write your C code in the editor
4. Click **Compile** (hammer icon) to build your ROM
5. Click **Run** (play icon) to test in the emulator
6. Click **Download** to save your .gb ROM file

## PNG Sprite Workflow

GB2GO automatically converts PNG images to Game Boy sprite data:

1. Create 8x8 pixel PNG files using any image editor
2. Use the Game Boy 4-color palette
3. Add PNG files to your project (drag & drop or New File → Sprite)
4. Include the generated header: `#include "sprites/mysprite.h"`
5. Use the tile data: `set_sprite_data(0, 1, mysprite_tiles);`

## Keyboard Shortcuts

- **Cmd/Ctrl + F**: Search in editor
- **Cmd/Ctrl + Z**: Undo
- **Cmd/Ctrl + Shift + Z**: Redo

## Emulator Controls

| Game Boy | Keyboard |
|----------|----------|
| D-Pad    | Arrow keys |
| A Button | Z |
| B Button | X |
| Start    | Enter |
| Select   | Shift |

Touch controls are available on mobile/tablet devices.

## API Documentation

Click the **Info** button (i icon) to browse GBDK header documentation, including:
- `gb/gb.h` - Core functions
- `gb/drawing.h` - Graphics primitives
- `gb/font.h` - Text rendering
- And more...

## Technical Details

GB2GO runs entirely in the browser using:
- **WebAssembly**: SDCC compiler, assembler, and linker
- **IndexedDB**: Persistent project storage
- **Canvas**: Emulator display and sprite rendering

No server-side processing - your code never leaves your device.

## License

This project ("GB2GO"), including the UI and glue code located in `src/` and `index.html`, is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for details.

### Third-Party Components

GB2GO relies on several powerful open-source tools distributed as WebAssembly:

- **SDCC / GBDK-2020** (GPLv2+LE) - C compiler and Game Boy development kit
- **Binjgb** (MIT) - Game Boy emulator
- **CodeMirror 6** (MIT) - Code editor

For a full list of third-party licenses and links to their source code, please see [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Development

GB2GO is a static site - no build step required for the main application.

To regenerate WASM modules or resources:

```bash
cd build
npm install
node extract-wasm.js
node extract-resources.js
```

## Links

- [GBDK-2020 Documentation](https://gbdk-2020.github.io/gbdk-2020/docs/api/)
- [Game Boy Pan Docs](https://gbdev.io/pandocs/)
- [Awesome Game Boy Development](https://github.com/gbdev/awesome-gbdev)
