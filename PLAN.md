# GB2GO: Browser-Based GBDK C Compiler - Implementation Plan

## Overview

Build a browser-only Game Boy development IDE optimized for iPad, using pre-compiled WASM modules from gbdk-emscripten, existing CodeMirror bundle, and binjgb for emulation.

## Architecture

**Separation of Concerns**:

- **Root directory**: Clean PWA - only static HTML/JS/CSS/WASM files
- **Build tools**: Separate `build/` folder with Node.js scripts to extract WASM/resources

**Key Components**:

- **Compiler Pipeline**: lcc (SDCC) → sdasgb (assembler) → sdldgb (linker) → makebin (HEX→ROM)
- **Editor**: CodeMirror 6 (user's existing bundle)
- **Emulator**: binjgb WASM
- **Storage**: IndexedDB + localStorage + ZIP import/export

## Project Structure

```
gb2go/
├── index.html                    # PWA entry point
├── manifest.json                 # PWA manifest
├── sw.js                         # Service worker (optional)
│
├── lib/                          # External libraries
│   ├── codemirror/              # User's existing CodeMirror bundle
│   ├── wasm/                    # Extracted WASM modules
│   │   ├── lcc.wasm
│   │   ├── lcc.js
│   │   ├── sdasgb.wasm
│   │   ├── sdasgb.js
│   │   ├── sdldgb.wasm
│   │   ├── sdldgb.js
│   │   ├── makebin.wasm
│   │   ├── makebin.js
│   │   ├── binjgb.wasm
│   │   └── binjgb.js
│   └── resources/               # GBDK resources (extracted)
│       ├── headers.json         # All GBDK .h files bundled
│       └── libraries.json       # All GBDK .lib files bundled
│
├── src/                         # Application source
│   ├── main.js                  # App initialization
│   ├── styles.css               # Global styles
│   ├── core/
│   │   ├── compiler.js          # GBDK compilation pipeline
│   │   ├── emulator.js          # Emulator wrapper
│   │   ├── storage.js           # IndexedDB + ZIP
│   │   └── vfs.js               # Virtual filesystem manager
│   ├── ui/
│   │   ├── editor.js            # CodeMirror integration
│   │   ├── toolbar.js           # Toolbar component
│   │   └── file-browser.js      # File tree component
│   └── templates/
│       └── hello-world.js       # Default project template
│
└── build/                       # Build tools (Node.js project)
    ├── package.json             # Node dependencies
    ├── extract-wasm.js          # Extract WASM from gbdk-emscripten
    ├── extract-resources.js     # Bundle GBDK headers/libs
    └── build-emulator.sh        # Build binjgb for browser
```

## Implementation Phases

### Phase 0: Build Tools Setup

- [x] Create `build/` directory
- [x] Create `build/package.json` with gbdk-emscripten dependency
- [x] Run `npm install` in build/ directory
- [x] Write `build/extract-wasm.js` script
  - [x] Extract sdcc compiler WASM + JS glue code
  - [x] Extract sdcpp preprocessor WASM + JS glue code
  - [x] Extract as-gbz80 assembler WASM + JS glue code
  - [x] Extract link-gbz80 linker WASM + JS glue code
  - [x] Glue code already browser-compatible (Emscripten auto-detects)
  - [x] Output all to `../lib/wasm/`
- [x] Write `build/extract-resources.js` script
  - [x] Extract all GBDK header files (.h) from gbdk-emscripten
  - [x] Bundle headers into `../lib/resources/headers.json` (25 files, 45.56 KB)
  - [x] Extract all GBDK library files (.lib)
  - [x] Bundle libraries into `../lib/resources/libraries.json` (2 files, 1.02 KB)
- [x] Write `build/build-emulator.sh` script
  - [x] Clone binjgb repository
  - [x] Build binjgb with Emscripten for browser
  - [x] Copy binjgb.wasm and binjgb.js to `../lib/wasm/`
- [x] Run extraction scripts to populate `lib/` directory
- [x] Verify all WASM files and resources are extracted correctly

### Phase 1: Foundation & Structure

- [x] Create root directory structure
  - [x] Create `lib/` directory
  - [x] Create `lib/wasm/` directory
  - [x] Create `lib/resources/` directory
  - [x] Create `lib/codemirror/` directory
  - [x] Create `src/` directory
  - [x] Create `src/core/` directory
  - [x] Create `src/ui/` directory
  - [x] Create `src/templates/` directory
- [x] Copy CodeMirror bundle from YACME
  - [x] Copy `../yacme/bundles/codemirror-bundle.js` to `lib/codemirror/codemirror-bundle.js`
- [x] Create `index.html` with basic structure
  - [x] Add viewport meta tags for iPad
  - [x] Add PWA meta tags
  - [x] Add import map for CodeMirror (see usage below)
  - [x] Link to styles
  - [x] Add canvas for emulator
  - [x] Add script imports
- [x] Create `manifest.json` for PWA
  - [x] Set app name, icons, colors
  - [x] Configure display mode as standalone
- [x] Create `src/styles.css` with basic layout
- [x] Create `.gitignore` (ignore build/node_modules)

### Phase 2: Virtual Filesystem

**Critical File**: `src/core/vfs.js`

- [x] Create VirtualFS class
- [x] Implement `initModule(Module, name)` - Initialize FS for each WASM module
- [x] Implement `preloadResources()` - Load GBDK headers/libs into virtual `/include` and `/lib`
- [x] Implement `writeFile(moduleName, path, content)` - Support text and binary modes
- [x] Implement `readFile(moduleName, path)` - Support text and binary modes
- [x] Implement `mkdirp(moduleName, path)` - Create directory trees
- [x] Implement `listFiles()`, `deleteFile()` helpers
- [x] Additional features: `fileExists()`, `stat()`, `copyFile()`, debug utilities
- [ ] Test with mock WASM module (will test in Phase 3 with real compiler)

### Phase 3: Compiler Pipeline

**Critical File**: `src/core/compiler.js`

- [x] Create GBDKCompiler class
- [x] Implement `_loadWasmModule(jsPath)` helper
- [x] Implement `initialize()` - Load all WASM modules (sdcpp, sdcc, as-gbz80, link-gbz80)
- [x] Implement `compile(options)` - Orchestrate full compilation pipeline
- [x] Implement `_preprocess()` - C preprocessing with sdcpp
- [x] Implement `_compileToAssembly()` - C to Assembly with sdcc
- [x] Implement `_assemble()` - Assembly to Object with as-gbz80
- [x] Implement `_link()` - Object files to Intel HEX with link-gbz80 (single file)
- [x] Implement `_linkMultiple()` - Link multiple object files together
- [x] Implement `_compileMultiFile()` - Multi-file compilation workflow
- [x] Implement `_ihxToRom()` - Intel HEX to .gb ROM format
- [x] Implement `_runModule()` - Generic WASM executor with stdout/stderr capture
- [x] Intel HEX parser and ROM header generation
- [x] Auto-detect all .c files in project and compile them
- [x] Auto-load all .h files from project into compiler VFS
- [x] Test with simple "Hello World" C program - **SUCCESSFULLY COMPILED!**
- [x] Test with multi-file projects - **SUCCESSFULLY COMPILED!**

### Phase 4: Storage

**Critical File**: `src/core/storage.js`

- [x] Create StorageManager class
- [x] Implement IndexedDB initialization (projects + files object stores)
- [x] Implement `createProject(name, template)` method
- [x] Implement `loadProject(projectId)` method
- [x] Implement `saveProject(project)` method
- [x] Implement `saveFile(projectId, path, content)` method
- [x] Implement `deleteFile(projectId, path)` method
- [x] Implement `listFiles(projectId)` method
- [x] Implement `listProjects()` method
- [x] Implement `deleteProject(projectId)` method
- [x] Implement ZIP export with JSZip (loads from CDN)
- [x] Implement ZIP import
- [x] Implement localStorage helpers (current project ID)
- [x] Request persistent storage API on Safari iOS
- [x] Integration with main.js (auto-save with 1s debounce)
- [x] File browser shows actual project files with click-to-switch
- [x] File creation with templates (C source, C header, empty)
- [x] File deletion with modal confirmation
- [x] File renaming
- [x] Project switcher with list of all projects
- [x] Project deletion with modal confirmation
- [x] Example project auto-recreates from template when deleted
- [ ] Folder/directory support for organizing files
- [ ] File moving between folders
- [ ] Nested folder creation
- [ ] Folder deletion (with contents)
- [ ] Tree view in file browser for folder hierarchy

### Phase 5: Emulator

**Critical File**: `src/core/emulator.js`

- [x] Create GameBoyEmulator class
- [x] Implement `initialize()` - Load binjgb.wasm
- [x] Implement `loadROM(romData)` - Write ROM to virtual FS
- [x] Implement `start()`, `pause()`, `reset()` - Playback controls
- [x] Implement `runFrame()` animation loop
- [x] Implement `setButton(button, pressed)` method
- [x] Virtual D-pad UI for touch (already in index.html)
- [x] A/B button UI for touch (already in index.html)
- [x] Touch events with preventDefault (integrated in main.js)
- [ ] Add keyboard input handling (arrow keys, Z/X, Enter/Space)
- [ ] Add haptic feedback if available
- [x] Test emulator with compiled ROM

**Note**: User runs the web server (not the assistant). Use `python3 -m http.server 8080` or similar.

### Phase 6: UI Components

### Phase 6: UI Components

- [x] Create `src/templates/hello-world.js` with multiple templates:
  - [x] Example template (graphics demo with shapes)
  - [x] Minimal template (basic starter)
  - [x] Sprite template (inline sprite data demo)
  - [x] Flappy Duck template (complete game with PNG sprites, demonstrates PNG→C workflow)
- [x] Create `src/main.js`
  - [x] Initialize storage, compiler, emulator
  - [x] Setup editor with auto-save (1s debounce)
  - [x] Load or create project from IndexedDB
  - [x] Wire up UI components (Toolbar, File Browser, Modals)
  - [x] Add error/log display
  - [x] Implement About Dialog
  - [x] Implement API Browser with GBDK documentation
  - [x] Implement ZIP export/import functionality
  - [x] File switching between multiple files in project
  - [x] New File dialog with templates
  - [x] New Project dialog with templates
  - [x] Project switcher modal
  - [x] Confirmation modal (replaces browser alerts)
  - [x] File actions (rename, delete) with hover buttons
  - [x] Multi-file compilation support
- [x] Update `index.html` with complete UI structure
- [x] Update `src/styles.css` with responsive, iPad-optimized styling
- [ ] Add keyboard shortcuts (Ctrl+B to compile, Ctrl+S to save, etc.)
- [ ] Add drag-and-drop file upload
- [ ] Refactor UI components into separate files (currently all in main.js)
  - [ ] `src/ui/editor.js`
  - [ ] `src/ui/toolbar.js`
  - [ ] `src/ui/file-browser.js`
  - [ ] `src/ui/modals.js`

### Phase 7: PWA & Testing

- [x] Add `manifest.json` with app metadata, icons, colors
- [x] Add app icons (192x192)
- [ ] Add service worker for offline support
- [ ] Test full compilation workflow on desktop
- [ ] Test multi-file compilation
- [ ] Test on iPad Safari
  - [ ] Test touch controls
  - [ ] Test storage persistence
  - [ ] Test ZIP export/import
  - [ ] Test "Add to Home Screen"
  - [ ] Test persistent storage API
- [x] Deploy to static hosting (GitHub Pages/Netlify)
- [ ] Verify deployment works on iPad

### Phase 8: Advanced Features (Future)

**File Management:**

- [ ] Folder/directory support
  - [ ] Create folders in project
  - [ ] Delete folders (with contents warning)
  - [ ] Move files between folders
  - [ ] Tree view in file browser
  - [ ] Collapse/expand folders
- [ ] Drag-and-drop file organization
- [ ] File search/filter in project
- [ ] Recent files list

**Sprite/Asset Tools:**

- [ ] Sprite editor (pixel art tool)
  - [ ] Draw sprites in browser
  - [ ] Color palette selection (GB 4-color palette)
  - [ ] Export sprite data to C arrays
  - [ ] Save sprites to project folders (e.g., `assets/sprites/`)
- [ ] Tileset editor
- [ ] Map editor (for backgrounds)
- [ ] Asset import (PNG → GB tiles)
- [ ] Asset preview in file browser

**Development Tools:**

- [ ] Debugger integration with binjgb
- [ ] Breakpoints in editor
- [ ] Memory viewer
- [ ] CPU register inspection
- [ ] Step-through execution
- [ ] Watch expressions

**Editor Enhancements:**

- [ ] Keyboard shortcuts (Ctrl+B compile, Ctrl+S save, etc.)
- [x] Find/replace in file (Cmd+F opens CodeMirror search panel)
- [ ] Find in project (search all files)
- [ ] Go to definition (LSP-like features)
- [ ] Code snippets
- [ ] Error highlighting in editor
- [ ] Compiler errors jump to line

**Emulator Enhancements:**

- [ ] Keyboard input support (arrow keys, Z/X, Enter/Space)
- [ ] Save states
- [ ] Screenshot capture
- [ ] Audio enable/disable toggle
- [ ] Speed control (1x, 2x, 4x)
- [ ] Rewind feature

## Critical Challenges & Solutions

| Challenge                                  | Solution                                         |
| ------------------------------------------ | ------------------------------------------------ |
| gbdk-emscripten uses Node.js child_process | Extract WASM + rewrite glue code for browser     |
| GBDK headers/libs accessibility            | Bundle as JSON, preload into virtual FS          |
| Compilation performance                    | Debounce (500ms), show progressive feedback      |
| iPad storage limits                        | IndexedDB + persistent storage API + ZIP backups |
| Touch controls                             | CSS virtual D-pad with haptic feedback           |

## Default Template

**hello-world/main.c**:

```c
#include <gb/gb.h>
#include <stdio.h>

void main(void) {
    printf("Hello World!");
    printf("GB2GO v1.0");
    waitpad(J_START);

    while(1) {
        scroll_bkg(1, 0);
        wait_vbl_done();
    }
}
```

## CodeMirror Bundle Usage (from YACME)

**Location**: `lib/codemirror/codemirror-bundle.js` (copied from `../yacme/bundles/`)

**Setup in index.html**:

```html
<script type="importmap">
  {
    "imports": {
      "CodeMirrorBundle": "./lib/codemirror/codemirror-bundle.js"
    }
  }
</script>
```

**Usage in JavaScript modules**:

```javascript
import {
  EditorState,
  EditorView,
  keymap,
  defaultKeymap,
  history,
  historyKeymap,
  // For C/C++ language support:
  languages,
  // For styling:
  oneDark,
  // For decorations/plugins:
  Decoration,
  ViewPlugin,
} from 'CodeMirrorBundle';

// Create editor
const editorView = new EditorView({
  state: EditorState.create({
    doc: initialCode,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      // Add C/C++ language mode here
      oneDark,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          // Handle code changes
        }
      }),
    ],
  }),
  parent: editorContainer,
});
```

**Available exports** (verified from YACME usage):

- EditorState, EditorView
- keymap, defaultKeymap, history, historyKeymap
- markdown, languages, markdownLanguage, GFM
- oneDark (theme)
- Decoration, ViewPlugin

## Critical Implementation Files

1. **src/core/vfs.js** - Virtual filesystem (foundation for WASM interaction)
2. **src/core/compiler.js** - Compilation pipeline orchestrator
3. **build/extract-wasm.js** - Extract/prepare WASM for browser
4. **src/core/storage.js** - Project persistence (IndexedDB + ZIP)
5. **src/main.js** - Application entry point

## Success Criteria

- ✅ Compile C code to .gb ROM entirely in browser
- ✅ Run compiled ROMs in integrated emulator
- ✅ Save/load projects with IndexedDB
- ✅ Export/import projects as ZIP
- ✅ Works on iPad Safari with touch controls
- ✅ No server required - pure static hosting

## Build Process (One-Time Setup)

```bash
# 1. Setup build tools
mkdir build
cd build
npm init -y
npm install gbdk-emscripten

# 2. Create and run extraction scripts
node extract-wasm.js       # Outputs to ../lib/wasm/
node extract-resources.js  # Outputs to ../lib/resources/
./build-emulator.sh        # Outputs to ../lib/wasm/

# 3. Copy CodeMirror bundle
cp -r /path/to/codemirror/bundle ../lib/codemirror/

# Done! The build/ folder is no longer needed for development
# Root directory is now a clean, static PWA
```

---

## Phase 9: Sprite System & Asset Pipeline

This phase adds comprehensive sprite and tile support to GB2Go, enabling visual asset creation and management.

### 9.0 Asset Workflow Philosophy

**Key Principle**: Assets are stored as PNG files in the project VFS, converted to C at compile time.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Sprite Editor  │────▶│  PNG in VFS     │────▶│  C Arrays       │
│  (Create/Edit)  │     │  (Persistent)   │     │  (At Compile)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      ▲
         │                      │
         ▼                      │
┌─────────────────┐             │
│  External PNG   │─────────────┘
│  (Import)       │
└─────────────────┘
```

**Benefits:**

- PNG is a standard format - editable in any image editor
- Project files remain portable (export ZIP, edit elsewhere, reimport)
- Sprite editor is optional - power users can use external tools
- Conversion happens transparently during compilation
- No custom binary formats to maintain

### 9.1 Sprite Converter Core (`src/core/sprite-converter.js`)

The converter transforms PNG pixel data into Game Boy 2bpp format and generates C code.

**Game Boy Tile Format (2bpp):**

- Each tile is 8x8 pixels, 16 bytes
- 2 bits per pixel = 4 colors (0-3)
- Stored as pairs of bytes: low bit plane, high bit plane per row
- Color mapping: 0 = transparent/lightest, 3 = darkest

```javascript
class SpriteConverter {
  // Read PNG from VFS and convert to GB format
  async convertPNG(pngPath, options) → { tiles, metadata, cCode, hCode }

  // Convert pixel data (ImageData) to 2bpp tile data
  pixelsToTile(pixels, palette) → Uint8Array(16)

  // Convert larger image to multiple tiles
  imageToTiles(imageData, width, height, palette) → { tiles, map }

  // Generate C source code from tiles
  generateCSpriteData(name, tiles, options) → string

  // Generate metasprite C code for multi-tile sprites
  generateMetasprite(name, tiles, width, height, options) → string

  // Auto-detect 4-color palette from image
  detectPalette(imageData) → [color0, color1, color2, color3]

  // Deduplicate tiles (with optional flip detection)
  deduplicateTiles(tiles, detectFlips) → { uniqueTiles, tileMap }

  // Export pixel data as PNG blob (for saving to VFS)
  exportToPNG(pixels, width, height, palette) → Blob
}
```

**Generated C Output Format:**

```c
// sprite_player.c - Generated by GB2Go from sprites/player.png
#include <gb/gb.h>
#include <gb/metasprites.h>

// Tile data (16 bytes per 8x8 tile)
const uint8_t player_tiles[] = {
    0x00, 0x00, 0x18, 0x18, 0x24, 0x24, ...
};
#define player_TILE_COUNT 4

// Metasprite definition (for 16x16 sprite)
const metasprite_t player_metasprite0[] = {
    METASPR_ITEM(-8, -8, 0, 0),
    METASPR_ITEM(0, 8, 1, 0),
    METASPR_ITEM(8, -8, 2, 0),
    METASPR_ITEM(0, 8, 3, 0),
    METASPR_TERM
};
const metasprite_t* const player_metasprites[1] = { player_metasprite0 };

// Header file (player.h)
extern const uint8_t player_tiles[];
extern const metasprite_t* const player_metasprites[];
#define player_TILE_COUNT 4
```

### 9.2 Sprite Editor UI (`src/ui/sprite-editor.js`)

A pixel art editor inspired by MOS, tailored for Game Boy constraints.
**Outputs PNG files to VFS for later editing.**

**Key Features:**

- [ ] Canvas-based 8x8, 16x16, or 32x32 sprite editing
- [ ] Strict 4-color palette (Game Boy limitation)
  - [ ] Palette presets: Classic DMG, Pocket, Custom
  - [ ] Color picker constrained to 4 slots
- [ ] Drawing tools: pencil, eraser, fill, line, rectangle
- [ ] Zoom levels: 8x, 16x, 32x (for pixel-precise editing)
- [ ] Grid overlay toggle
- [ ] Undo/redo stack
- [ ] Sprite preview at 1x scale
- [ ] Animation frames (for animated sprites)
  - [ ] Frame timeline
  - [ ] Onion skin preview
  - [ ] Frame duplication/reordering
  - [ ] Export as sprite sheet PNG (frames arranged horizontally)
- [ ] **Save to VFS as PNG** (persistent, re-editable)
- [ ] Copy sprite data to clipboard

**Save Format:**

```
sprites/player.png           # Main sprite (8x8, 16x16, etc.)
sprites/player_sheet.png     # Animation sheet (frames side-by-side)
sprites/player.meta.json     # Optional metadata (animation timing, collision box)
```

**Metadata File (optional, for advanced features):**

```json
{
  "type": "sprite",
  "width": 16,
  "height": 16,
  "spriteMode": "8x16",
  "animation": {
    "frames": 4,
    "frameWidth": 16,
    "fps": 8
  },
  "collision": {
    "x": 2,
    "y": 4,
    "w": 12,
    "h": 12
  },
  "palette": ["#9bbc0f", "#8bac0f", "#306230", "#0f380f"]
}
```

### 9.3 PNG Support in VFS

Extend storage to handle binary PNG files.

- [x] `storage.js` updates:
  - [x] Store PNG as base64 in IndexedDB
  - [x] `saveFile()` detects binary vs text by extension
  - [x] `loadFile()` returns appropriate type
- [x] File browser shows PNG thumbnails
- [ ] Double-click PNG opens in sprite editor
- [ ] Drag-and-drop PNG import to project

### 9.4 PNG Import

Import external PNG images into project.

- [ ] Drag-and-drop PNG upload to file browser
- [ ] File picker for PNG selection
- [ ] Import dialog:
  - [ ] Preview image
  - [ ] Auto-detect palette (show 4 colors found)
  - [ ] Size validation (warn if not multiple of 8)
  - [ ] Destination path in project
- [ ] Copy PNG to VFS after confirmation
- [ ] Open in sprite editor for adjustment if needed

### 9.5 Compile-Time Asset Conversion

Automatically convert PNG assets to C during compilation.

**Compiler Pipeline Update:**

```
1. Scan project for PNG files in sprites/ and backgrounds/
2. For each PNG:
   a. Read from VFS
   b. Check for .meta.json (optional settings)
   c. Convert to 2bpp tiles
   d. Generate .c and .h files (in memory or gen/ folder)
3. Include generated C files in compilation
4. Link and produce ROM
```

**Configuration in project.json:**

```json
{
  "assets": {
    "autoConvert": true,
    "spriteDirectories": ["sprites/"],
    "backgroundDirectories": ["backgrounds/"],
    "outputDirectory": "gen/",
    "defaultSpriteMode": "8x16"
  }
}
```

### 9.6 Tilemap/Background Editor (`src/ui/tilemap-editor.js`)

For creating background tilemaps. Outputs PNG tileset + JSON tilemap.

- [ ] 20x18 tile grid (Game Boy screen size)
- [ ] Scrollable larger maps
- [ ] Tileset palette (load PNG tileset)
- [ ] Stamp tool for placing tiles
- [ ] Tile picker from tileset
- [ ] **Save tileset as PNG, map as JSON**
- [ ] Preview mode
- [ ] Export as tilemap + tileset C arrays (at compile time)

**Save Format:**

```
backgrounds/level1_tiles.png    # Tileset image
backgrounds/level1_map.json     # Tile indices
backgrounds/level1.meta.json    # Optional metadata
```

### 9.7 Asset File Organization

**Recommended Project Structure:**

```
my-game/
├── main.c
├── sprites/
│   ├── player.png            # Created in editor or imported
│   ├── player.meta.json      # Optional metadata
│   ├── enemy.png
│   └── items.png             # Can be sprite sheet
├── backgrounds/
│   ├── title_tiles.png       # Tileset
│   ├── title_map.json        # Tilemap
│   └── level1_tiles.png
├── gen/                      # Auto-generated (can be hidden)
│   ├── player.c
│   ├── player.h
│   ├── enemy.c
│   └── enemy.h
└── project.json              # Project configuration
```

---

## Phase 10: Build Units & Project Configuration

This phase adds project configuration for customizing builds, including optional library integration.

### 10.1 Project Configuration File (`project.json`)

```json
{
  "name": "My Game",
  "version": "1.0.0",
  "target": "gb",

  "build": {
    "entryPoint": "main.c",
    "outputName": "game",
    "spriteMode": "8x16",
    "colorMode": "dmg"
  },

  "assets": {
    "autoConvert": true,
    "spriteDirectories": ["sprites/"],
    "backgroundDirectories": ["backgrounds/"],
    "outputDirectory": "gen/",
    "deduplicateTiles": true,
    "detectFlips": true
  },

  "libraries": {
    "zgb": {
      "enabled": false,
      "version": "2023.0"
    }
  },

  "compiler": {
    "optimization": "-Os",
    "defines": ["DEBUG=0"],
    "includes": ["src/", "gen/"]
  }
}
```

### 10.2 Build Unit System

**Build Unit Types:**

1. **Source Unit** - C source files to compile
2. **Asset Unit** - PNG files to convert to C
3. **Library Unit** - External library references (ZGB, custom libs)

**Compilation Pipeline Update:**

```
1. Parse project.json
2. Scan for PNG assets in configured directories
3. Convert PNG → C (using sprite-converter)
4. Resolve library dependencies
5. Compile all C files (project + generated + library stubs)
6. Link with GBDK + optional libraries
7. Generate ROM
```

### 10.3 Library Management

**Bundled Libraries (stored in `lib/libraries/`):**

- GBDK core (already bundled)
- Optional: ZGB engine (if enabled)
- Optional: hUGEDriver (music/sound)

**Library Structure:**

```
lib/libraries/
├── zgb/
│   ├── zgb.json           # Library manifest
│   ├── headers/           # .h files
│   │   ├── ZGBMain.h
│   │   ├── Sprite.h
│   │   ├── SpriteManager.h
│   │   └── ...
│   └── source/            # .c files (compiled with project)
│       ├── Sprite.c
│       ├── SpriteManager.c
│       └── ...
└── hugedriver/
    ├── hugedriver.json
    ├── headers/
    └── source/
```

### 10.4 Project Configuration UI

- [ ] Project Settings modal
  - [ ] Build target (GB, GBC)
  - [ ] Sprite mode (8x8, 8x16)
  - [ ] Color mode (DMG 4-color, CGB palettes)
  - [ ] Compiler flags
- [ ] Library browser/installer
  - [ ] List available libraries
  - [ ] Enable/disable toggle
  - [ ] Library documentation links
- [ ] Asset pipeline settings
  - [ ] Auto-convert on compile toggle
  - [ ] Manual asset regeneration button
  - [ ] Tile deduplication toggle

---

## Phase 11: ZGB Integration (Optional Engine)

ZGB is a complete game engine for GBDK. This phase makes it available as an optional library.

### 11.1 ZGB Feature Set

When ZGB is enabled, projects get access to:

- **Sprite Management**: Automatic lifecycle (Start/Update/Destroy)
- **State Machine**: Scene/state management
- **Collision System**: Sprite-to-sprite and sprite-to-map collisions
- **Animation System**: Frame-based sprite animation
- **Map System**: Scrolling background support
- **Input Handling**: Simplified input polling

### 11.2 ZGB Project Template

New template option: "ZGB Game"

```c
// ZGBMain.h - ZGB Configuration
#ifndef ZGBMAIN_H
#define ZGBMAIN_H

#include "ZGB.h"

// Sprites definition
typedef enum {
    SPRITE_PLAYER,
    SPRITE_ENEMY,
    N_SPRITE_TYPES
} SPRITE_TYPE;

// States definition
typedef enum {
    STATE_GAME,
    STATE_MENU,
    N_STATES
} STATE_TYPE;

// Sprite registrations
#define SPRITES_8x16
_SPRITE_DMG(SPRITE_PLAYER, player)
_SPRITE_DMG(SPRITE_ENEMY, enemy)

#endif
```

### 11.3 ZGB-Aware Sprite Editor

When ZGB is enabled, the sprite editor adds:

- [ ] Animation frame export in ZGB format (sprite sheet)
- [ ] Collision box editor (stored in .meta.json)
- [ ] Sprite type assignment
- [ ] ZGB-compatible C generation with animation arrays

### 11.4 ZGB Library Bundling

**Build-time extraction (one-time):**

```bash
cd build
node extract-zgb.js  # Downloads and extracts ZGB to lib/libraries/zgb/
```

**Runtime loading:**

- ZGB headers loaded into VFS when enabled
- ZGB source files compiled alongside project
- Linker includes ZGB object code

### 11.5 ZGB Documentation Integration

- [ ] ZGB API browser (similar to GBDK API browser)
- [ ] ZGB-specific code snippets
- [ ] Example ZGB project template
- [ ] Links to ZGB wiki/documentation

---

## Phase 12: Implementation Checklist

### Core Converter

- [x] `src/core/sprite-converter.js`
  - [x] PNG decoding (canvas-based)
  - [x] RGB to palette index mapping
  - [x] 2bpp tile encoding (8x8 → 16 bytes)
  - [x] C code generation with proper formatting
  - [ ] Metasprite generation for larger sprites (16x16+)
  - [ ] Tile deduplication with flip detection
  - [ ] Palette auto-detection
  - [ ] PNG export (for sprite editor saves)

### Storage Updates

- [x] `src/core/storage.js` modifications
  - [x] Binary file support (base64 encoding)
  - [x] File type detection by extension
  - [x] PNG thumbnail generation for file browser

### Sprite Editor

- [ ] `src/ui/sprite-editor.js`
  - [ ] Canvas setup with pixel grid
  - [ ] 4-color palette UI
  - [ ] Drawing tools (pencil, eraser, fill, line, rect)
  - [ ] Undo/redo with history stack
  - [ ] Zoom controls
  - [ ] Animation frame timeline
  - [ ] Onion skin toggle
  - [ ] **Save to PNG in VFS**
  - [ ] **Load PNG from VFS for editing**

### PNG Import

- [ ] `src/core/png-importer.js`
  - [ ] Drag-and-drop handling
  - [ ] File picker integration
  - [ ] Color quantization preview
  - [ ] Size validation
  - [ ] Copy to VFS

### Project Configuration

- [ ] `src/core/project-config.js`
  - [ ] Parse project.json
  - [ ] Validate configuration
  - [ ] Default values
  - [ ] Library resolution

### Build Pipeline Updates

- [x] `src/core/compiler.js` modifications
  - [x] Scan for PNG assets in project
  - [x] Convert PNGs to C before compilation (sprite-converter.js)
  - [x] Include generated C in compilation
  - [ ] Library source inclusion
  - [ ] Project config integration

### UI Updates

- [x] File browser PNG support (thumbnails shown)
- [ ] Double-click PNG to edit in sprite editor
- [ ] Sprite editor modal/panel
- [ ] Project settings modal
- [ ] Library manager UI
- [x] Resizable panels (Split.js) - file browser and editor resizable, emulator fixed
- [x] CodeMirror search integration (Cmd+F)

---

## Architecture Decisions

### Why PNG as Source Format?

**Option 1: Custom JSON format** ❌

- Non-standard, can't use external tools
- Requires custom import/export for external editing

**Option 2: PNG files in VFS** ✅

- Universal format, any image editor works
- Project remains portable (export ZIP, edit externally)
- Thumbnails easy to generate
- Small file size with compression
- Metadata in separate .meta.json file

### Why Browser-Native Sprite Conversion?

**Option 1: Port png2asset to WASM** ❌

- Complex: png2asset has many dependencies
- Overkill for browser use case
- Large WASM bundle size

**Option 2: Reimplement in JavaScript** ✅

- Simpler: We only need core 2bpp conversion
- Faster: No WASM overhead for simple operations
- Extensible: Easy to customize for our UI
- Smaller: Pure JS is lightweight

### Build Units vs. Makefiles

Traditional GBDK uses Makefiles. We use JSON configuration because:

- **Portability**: JSON works in browser, Makefiles don't
- **Simplicity**: Users don't need to learn Make syntax
- **UI-friendly**: Easy to build settings UI
- **Extensible**: Add new options without parsing complexity

### ZGB Integration Strategy

ZGB is distributed as source code, not compiled libraries. Our approach:

1. **Bundle headers**: Store in `lib/libraries/zgb/headers/`
2. **Bundle sources**: Store in `lib/libraries/zgb/source/`
3. **Compile together**: Include ZGB .c files in compilation
4. **Link normally**: Standard GBDK linking

This matches how ZGB works natively, just automated in browser.

---

## Next Steps

1. Setup build tools folder
2. Write extraction scripts
3. Run extraction (one-time)
4. Copy CodeMirror bundle
5. Create root project structure (HTML, manifest, src/)
6. Implement core modules (vfs, compiler, storage, emulator)
7. Build UI components
8. Test on iPad Safari
9. **Add PNG support to storage (binary files)**
10. **Implement sprite converter core**
11. **Build sprite editor UI (saves PNG to VFS)**
12. **Add PNG import support**
13. **Update compiler to convert PNGs at build time**
14. **Implement project configuration**
15. **Integrate ZGB as optional library**
