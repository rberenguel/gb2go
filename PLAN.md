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

- [ ] Create `build/` directory
- [ ] Create `build/package.json` with gbdk-emscripten dependency
- [ ] Run `npm install` in build/ directory
- [ ] Write `build/extract-wasm.js` script
  - [ ] Extract lcc compiler WASM + JS glue code
  - [ ] Extract sdasgb assembler WASM + JS glue code
  - [ ] Extract sdldgb linker WASM + JS glue code
  - [ ] Extract makebin converter WASM + JS glue code
  - [ ] Modify glue code for browser compatibility (remove Node.js APIs)
  - [ ] Output all to `../lib/wasm/`
- [ ] Write `build/extract-resources.js` script
  - [ ] Extract all GBDK header files (.h) from gbdk-emscripten
  - [ ] Bundle headers into `../lib/resources/headers.json`
  - [ ] Extract all GBDK library files (.lib)
  - [ ] Bundle libraries into `../lib/resources/libraries.json`
- [ ] Write `build/build-emulator.sh` script
  - [ ] Clone binjgb repository
  - [ ] Build binjgb with Emscripten for browser
  - [ ] Copy binjgb.wasm and binjgb.js to `../lib/wasm/`
- [ ] Run extraction scripts to populate `lib/` directory
- [ ] Verify all WASM files and resources are extracted correctly

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
- [ ] Create `index.html` with basic structure
  - [ ] Add viewport meta tags for iPad
  - [ ] Add PWA meta tags
  - [ ] Add import map for CodeMirror (see usage below)
  - [ ] Link to styles
  - [ ] Add canvas for emulator
  - [ ] Add script imports
- [ ] Create `manifest.json` for PWA
  - [ ] Set app name, icons, colors
  - [ ] Configure display mode as standalone
- [ ] Create `src/styles.css` with basic layout
- [ ] Create `.gitignore` (ignore build/node_modules)

### Phase 2: Virtual Filesystem

**Critical File**: `src/core/vfs.js`

- [ ] Create VirtualFS class
- [ ] Implement `initModule(Module, name)` - Initialize FS for each WASM module
- [ ] Implement `preloadResources()` - Load GBDK headers/libs into virtual `/include` and `/lib`
- [ ] Implement `writeFile(moduleName, path, content)` - Support text and binary modes
- [ ] Implement `readFile(moduleName, path)` - Support text and binary modes
- [ ] Implement `mkdirp(moduleName, path)` - Create directory trees
- [ ] Implement `listFiles()`, `deleteFile()` helpers
- [ ] Test with mock WASM module

### Phase 3: Compiler Pipeline

**Critical File**: `src/core/compiler.js`

- [ ] Create GBDKCompiler class
- [ ] Implement `loadWasmModule(jsPath)` helper
- [ ] Implement `initialize()` - Load all WASM modules (lcc, sdasgb, sdldgb, makebin)
- [ ] Implement `compile(project)` - Orchestrate full pipeline
- [ ] Implement `runLCC(inputFile, outputFile)` - C to Assembly
- [ ] Implement `runSdasgb(inputFile, outputFile)` - ASM to Object
- [ ] Implement `runSdldgb(objFiles, outputFile)` - Objects to HEX
- [ ] Implement `runMakebin(inputFile, outputFile)` - HEX to GB ROM
- [ ] Implement `runCommand(module, name, args)` - Generic WASM executor
- [ ] Test with simple "Hello World" C program

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

- [ ] Create GameBoyEmulator class
- [ ] Implement `initialize()` - Load binjgb.wasm
- [ ] Implement `loadROM(romData)` - Write ROM to virtual FS
- [ ] Implement `start()`, `pause()`, `reset()` - Playback controls
- [ ] Implement `runFrame()` animation loop
- [ ] Implement keyboard input handling (arrow keys, Z/X, Enter/Space)
- [ ] Implement `setButton(button, pressed)` method
- [ ] Create virtual D-pad UI for touch
- [ ] Create A/B button UI for touch
- [ ] Handle touch events with preventDefault
- [ ] Add haptic feedback if available
- [ ] Test emulator with known working ROM

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
