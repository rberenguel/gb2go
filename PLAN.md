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
- [x] Implement `compile(options)` - Orchestrate full 5-step pipeline
- [x] Implement `_preprocess()` - C preprocessing with sdcpp
- [x] Implement `_compileToAssembly()` - C to Assembly with sdcc
- [x] Implement `_assemble()` - Assembly to Object with as-gbz80
- [x] Implement `_link()` - Object files to Intel HEX with link-gbz80
- [x] Implement `_ihxToRom()` - Intel HEX to .gb ROM format
- [x] Implement `_runModule()` - Generic WASM executor with stdout/stderr capture
- [x] Intel HEX parser and ROM header generation
- [x] Test with simple "Hello World" C program - **SUCCESSFULLY COMPILED!**

### Phase 4: Storage

**Critical File**: `src/core/storage.js`

- [ ] Create StorageManager class
- [ ] Implement IndexedDB initialization (projects + files object stores)
- [ ] Implement `createProject(name, template)` method
- [ ] Implement `loadProject(projectId)` method
- [ ] Implement `saveProject(project)` method
- [ ] Implement `saveFile(projectId, path, content)` method
- [ ] Implement `deleteFile(projectId, path)` method
- [ ] Implement `listProjects()` method
- [ ] Implement `deleteProject(projectId)` method
- [ ] Implement ZIP export with JSZip
- [ ] Implement ZIP import
- [ ] Implement localStorage helpers (current project ID)
- [ ] Request persistent storage API on Safari iOS
- [ ] Test storage operations in browser

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

- [ ] Create `src/ui/editor.js`
  - [ ] Import CodeMirror from lib/codemirror/
  - [ ] Create CodeEditor class
  - [ ] Configure C/C++ language mode
  - [ ] Add GBDK-specific autocomplete
  - [ ] Implement file loading
  - [ ] Add debouncing (500ms)
- [ ] Create `src/ui/toolbar.js`
  - [ ] Add Compile button
  - [ ] Add Run/Pause/Reset buttons
  - [ ] Add Export/Import ZIP buttons
- [ ] Create `src/ui/file-browser.js`
  - [ ] List project files
  - [ ] Handle file selection
  - [ ] Add new file functionality
- [ ] Create `src/templates/hello-world.js` with default C code
- [ ] Create `src/main.js`
  - [ ] Initialize storage, compiler, emulator
  - [ ] Setup editor
  - [ ] Load or create project
  - [ ] Wire up UI components
  - [ ] Add error/log display
- [ ] Update `index.html` with complete UI structure
- [ ] Update `src/styles.css` with responsive, iPad-optimized styling

### Phase 7: PWA & Testing

- [ ] Add `manifest.json` with app metadata, icons, colors
- [ ] Add app icons (192x192, 512x512)
- [ ] Optional: Add service worker for offline support
- [ ] Test full compilation workflow on desktop
- [ ] Test on iPad Safari
  - [ ] Test touch controls
  - [ ] Test storage persistence
  - [ ] Test ZIP export/import
  - [ ] Test "Add to Home Screen"
- [ ] Deploy to static hosting (GitHub Pages/Netlify)
- [ ] Verify deployment works on iPad

## Critical Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| gbdk-emscripten uses Node.js child_process | Extract WASM + rewrite glue code for browser |
| GBDK headers/libs accessibility | Bundle as JSON, preload into virtual FS |
| Compilation performance | Debounce (500ms), show progressive feedback |
| iPad storage limits | IndexedDB + persistent storage API + ZIP backups |
| Touch controls | CSS virtual D-pad with haptic feedback |

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
} from "CodeMirrorBundle";

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

## Next Steps

1. Setup build tools folder
2. Write extraction scripts
3. Run extraction (one-time)
4. Copy CodeMirror bundle
5. Create root project structure (HTML, manifest, src/)
6. Implement core modules (vfs, compiler, storage, emulator)
7. Build UI components
8. Test on iPad Safari
