/**
 * GB2GO - Main Application Entry Point
 * Browser-based Game Boy Development IDE
 */

import { GBDKCompiler } from './core/compiler.js';
import { GameBoyEmulator } from './core/emulator.js';
import { helloWorldTemplate } from './templates/hello-world.js';

// Application state
const app = {
  currentFile: 'main.c',
  currentProject: helloWorldTemplate,
  currentSource: helloWorldTemplate.files['main.c'],
  compiledRom: null,
  editor: null,
  compiler: null,
  emulator: null,
  storage: null
};

/**
 * Initialize the application
 */
async function init() {
  console.log('GB2GO: Initializing...');

  // Show loading overlay
  showLoading('Initializing GB2GO...');

  try {
    // TODO: Initialize storage manager
    // app.storage = new StorageManager();

    // Initialize compiler
    log('Initializing GBDK compiler...', 'info');
    app.compiler = new GBDKCompiler();

    // Set up compiler callbacks
    app.compiler.onLog = (message, type) => log(message, type);
    app.compiler.onProgress = (message, percentage) => {
      log(`[${percentage}%] ${message}`, 'info');
    };
    app.compiler.onError = (message) => log(message, 'error');

    await app.compiler.initialize();

    // Initialize emulator
    log('Initializing Game Boy emulator...', 'info');
    app.emulator = new GameBoyEmulator();

    // Set up emulator callbacks
    app.emulator.onError = (message) => log(message, 'error');
    app.emulator.onFrame = () => {
      // Called every frame - could be used for performance monitoring
    };

    const canvas = document.getElementById('emulator-canvas');
    await app.emulator.initialize(canvas);

    // Initialize UI
    initUI();

    // Display the default source code
    displaySource();

    // Hide loading overlay
    hideLoading();

    log('GB2GO ready! Compiler and emulator initialized.', 'success');
    log('Click "Compile" to build the Hello World program.', 'info');

  } catch (error) {
    console.error('Initialization error:', error);
    hideLoading();
    log(`Initialization error: ${error.message}`, 'error');
  }
}

/**
 * Initialize UI event listeners
 */
function initUI() {
  // Compile button
  const btnCompile = document.getElementById('btn-compile');
  if (btnCompile) {
    btnCompile.addEventListener('click', handleCompile);
  }

  // Run button
  const btnRun = document.getElementById('btn-run');
  if (btnRun) {
    btnRun.addEventListener('click', handleRun);
  }

  // Pause button
  const btnPause = document.getElementById('btn-pause');
  if (btnPause) {
    btnPause.addEventListener('click', handlePause);
  }

  // Reset button
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', handleReset);
  }

  // Download button
  const btnDownload = document.getElementById('btn-download');
  if (btnDownload) {
    btnDownload.addEventListener('click', handleDownload);
  }

  // Export button
  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    btnExport.addEventListener('click', handleExport);
  }

  // Import button
  const btnImport = document.getElementById('btn-import');
  if (btnImport) {
    btnImport.addEventListener('click', handleImport);
  }

  // New file button
  const btnNewFile = document.getElementById('btn-new-file');
  if (btnNewFile) {
    btnNewFile.addEventListener('click', handleNewFile);
  }

  // Clear console button
  const btnClearConsole = document.getElementById('btn-clear-console');
  if (btnClearConsole) {
    btnClearConsole.addEventListener('click', clearConsole);
  }

  // File input for importing
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileInputChange);
  }

  // Initialize touch controls
  initTouchControls();

  // Initialize File Browser (Mock)
  const fileBrowser = document.getElementById('file-browser');
  if (fileBrowser) {
    fileBrowser.innerHTML = `
      <div class="file-tree-item active" title="Source File">
        <span style="margin-right: 5px;">📄</span> main.c
      </div>
      <div class="file-tree-item" style="opacity: 0.6; cursor: default;" title="Not implemented">
        <span style="margin-right: 5px;">⚙️</span> project.json
      </div>
    `;
  }

  // Sidebar Toggles
  const toggleFilesBtn = document.getElementById('toggle-files');
  const filePanel = document.getElementById('file-browser-panel');
  if (toggleFilesBtn && filePanel) {
    toggleFilesBtn.addEventListener('click', () => {
      filePanel.classList.toggle('collapsed');
      const isCollapsed = filePanel.classList.contains('collapsed');
      
      if (isCollapsed) {
        // fileBrowser.style.display = 'none'; // handled by CSS
        toggleFilesBtn.textContent = '▶';
        toggleFilesBtn.title = 'Expand';
      } else {
        // fileBrowser.style.display = 'block'; // handled by CSS
        toggleFilesBtn.textContent = '◀';
        toggleFilesBtn.title = 'Collapse';
      }
    });
  }

  const toggleEmuBtn = document.getElementById('toggle-emulator');
  const emuPanel = document.getElementById('emulator-panel');
  if (toggleEmuBtn && emuPanel) {
    toggleEmuBtn.addEventListener('click', () => {
      emuPanel.classList.toggle('collapsed');
      const isCollapsed = emuPanel.classList.contains('collapsed');

      if (isCollapsed) {
        toggleEmuBtn.textContent = '◀'; // Arrow points left to expand
        toggleEmuBtn.title = 'Expand';
      } else {
        toggleEmuBtn.textContent = '▶'; // Arrow points right to collapse
        toggleEmuBtn.title = 'Collapse';
      }
    });
  }

  console.log('UI initialized');
}

/**
 * Initialize touch controls for emulator
 */
function initTouchControls() {
  const buttons = document.querySelectorAll('[data-button]');

  buttons.forEach(button => {
    const buttonName = button.dataset.button;

    // Touch events
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleButtonPress(buttonName, true);
    });

    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleButtonPress(buttonName, false);
    });

    // Mouse events for desktop testing
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleButtonPress(buttonName, true);
    });

    button.addEventListener('mouseup', (e) => {
      e.preventDefault();
      handleButtonPress(buttonName, false);
    });
  });
}

/**
 * Handle button press/release for emulator
 */
function handleButtonPress(button, pressed) {
  if (app.emulator) {
    app.emulator.setButton(button, pressed);
  } else {
    console.log(`Button ${button}: ${pressed ? 'pressed' : 'released'}`);
  }
}

/**
 * Display source code in editor area
 */
async function displaySource() {
  const editorContainer = document.getElementById('editor-container');
  if (!editorContainer) return;

  editorContainer.innerHTML = '';

  try {
    const { 
      EditorState, EditorView, 
      keymap, defaultKeymap, 
      history, historyKeymap, 
      oneDark, languages,
      Decoration, ViewPlugin
    } = await import('CodeMirrorBundle');
    
    // Active Line Plugin (Custom implementation since it's missing from bundle)
    const activeLineHighlighter = ViewPlugin.fromClass(class {
      constructor(view) {
        this.decorations = this.getDeco(view);
      }
      update(update) {
        if (update.docChanged || update.selectionSet)
          this.decorations = this.getDeco(update.view);
      }
      getDeco(view) {
        const { selection, doc } = view.state;
        const decos = [];
        const seenLines = new Set();
        
        for (const range of selection.ranges) {
            const line = doc.lineAt(range.head);
            if (!seenLines.has(line.from)) {
                seenLines.add(line.from);
                decos.push(Decoration.line({ class: "cm-activeLine" }).range(line.from));
            }
        }
        // Decoration.set requires sorted decorations
        decos.sort((a, b) => a.from - b.from);
        return Decoration.set(decos);
      }
    }, {
      decorations: v => v.decorations
    });

    // Build extensions
    const extensions = [
      oneDark,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      activeLineHighlighter,
      EditorView.theme({
        "&": { height: "100%", backgroundColor: "#1e1e1e !important" },
        ".cm-scroller": { overflow: "auto", fontFamily: "'Monoid', 'SF Mono', monospace !important" },
        ".cm-content": { backgroundColor: "#1e1e1e !important", fontFamily: "'Monoid', 'SF Mono', monospace !important" },
        ".cm-gutters": { backgroundColor: "#1e1e1e !important", borderRight: "1px solid #2d2d30" }
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
           app.currentSource = update.state.doc.toString();
        }
      })
    ];

    // Try to load C/C++ syntax highlighting
    try {
      // Look for C or C++ in the languages list (standard CM6 language-data uses 'C++')
      const cLang = languages.find(l => l.name === 'C++' || l.alias.includes('c') || l.alias.includes('cpp'));
      if (cLang) {
        const cSupport = await cLang.load();
        extensions.push(cSupport);
        log('C syntax highlighting loaded.', 'info');
      } else {
        log('C language definition not found in bundle.', 'warning');
      }
    } catch (e) {
      console.warn('Could not load C syntax highlighting:', e);
      log('Syntax highlighting unavailable (using plain text).', 'warning');
    }

    // Create state and view
    const state = EditorState.create({
      doc: app.currentSource,
      extensions: extensions
    });

    app.editor = new EditorView({
      state,
      parent: editorContainer
    });

    log('CodeMirror editor initialized.', 'info');

  } catch (err) {
    console.warn('Failed to load CodeMirror bundled modules:', err);
    // Fallback to Textarea
    const textarea = document.createElement('textarea');
    textarea.id = 'source-editor';
    textarea.value = app.currentSource;
    textarea.style.cssText = `
      width: 100%;
      height: 100%;
      flex: 1;
      background: #1e1e1e;
      color: #d4d4d4;
      border: none;
      padding: 16px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
      font-size: 14px;
      line-height: 1.6;
      resize: none;
      outline: none;
    `;
    textarea.addEventListener('input', (e) => {
      app.currentSource = e.target.value;
    });
    editorContainer.appendChild(textarea);
  }
}

/**
 * Event Handlers
 */
async function handleCompile() {
  if (!app.compiler) {
    log('Compiler not initialized yet.', 'error');
    return;
  }

  if (app.compiler.isCompiling) {
    log('Compilation already in progress...', 'warning');
    return;
  }

  clearConsole();
  log('Starting compilation...', 'info');

  const compileBtn = document.getElementById('btn-compile');
  const runBtn = document.getElementById('btn-run');
  const downloadBtn = document.getElementById('btn-download');

  try {
    // Disable compile button during compilation
    if (compileBtn) compileBtn.disabled = true;

    // Compile the current source
    const romData = await app.compiler.compile({
      source: app.currentSource,
      filename: app.currentFile
    });

    // Store compiled ROM
    app.compiledRom = romData;

    log(`✓ ROM compiled successfully! (${romData.length} bytes)`, 'success');

    // Debug: Show ROM entry point
    const entryBytes = Array.from(romData.slice(0x100, 0x104))
      .map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    log(`Entry point (0x0100): ${entryBytes}`, 'info');

    // Verify header checksum
    let checksum = 0;
    for (let i = 0x0134; i <= 0x014C; i++) {
      checksum = checksum - romData[i] - 1;
    }
    const isValid = (checksum & 0xFF) === romData[0x014D];
    log(`Header checksum: ${isValid ? '✓ Valid' : '✗ Invalid'}`, isValid ? 'success' : 'error');

    log('ROM ready to run. Click "Run" to start the emulator.', 'info');

    // Enable run and download buttons
    if (runBtn) runBtn.disabled = false;
    if (downloadBtn) downloadBtn.disabled = false;

  } catch (error) {
    log(`✗ Compilation failed: ${error.message}`, 'error');
    console.error('Compilation error:', error);
  } finally {
    // Re-enable compile button
    if (compileBtn) compileBtn.disabled = false;
  }
}

async function handleRun() {
  if (!app.compiledRom) {
    log('No ROM compiled yet. Click "Compile" first.', 'warning');
    return;
  }

  if (!app.emulator) {
    log('Emulator not initialized.', 'error');
    return;
  }

  try {
    const runBtn = document.getElementById('btn-run');
    const pauseBtn = document.getElementById('btn-pause');
    const resetBtn = document.getElementById('btn-reset');

    // Load ROM into emulator
    log('Loading ROM into emulator...', 'info');
    await app.emulator.loadROM(app.compiledRom);
    log('ROM loaded! Starting emulator...', 'success');

    // Start the emulator
    app.emulator.start();
    log('Emulator running! Use on-screen controls or keyboard.', 'info');

    // Update button states
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.hidden = true;
    }
    if (pauseBtn) {
      pauseBtn.disabled = false;
      pauseBtn.hidden = false;
    }
    if (resetBtn) {
      resetBtn.disabled = false;
    }
  } catch (error) {
    log(`Failed to run ROM: ${error.message}`, 'error');
    console.error('Run error:', error);
  }
}

function handlePause() {
  if (!app.emulator) {
    return;
  }

  const runBtn = document.getElementById('btn-run');
  const pauseBtn = document.getElementById('btn-pause');

  if (app.emulator.isRunning) {
    app.emulator.pause();
    log('Emulator paused.', 'info');

    // Update button states
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.hidden = false;
      runBtn.innerHTML = '<span class="btn-icon">▶️</span> Resume';
    }
    if (pauseBtn) {
      pauseBtn.hidden = true;
    }
  } else {
    app.emulator.start();
    log('Emulator resumed.', 'info');

    // Update button states
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.hidden = true;
    }
    if (pauseBtn) {
      pauseBtn.disabled = false;
      pauseBtn.hidden = false;
    }
  }
}

function handleReset() {
  if (!app.emulator) {
    return;
  }

  const runBtn = document.getElementById('btn-run');
  const pauseBtn = document.getElementById('btn-pause');

  app.emulator.reset();
  log('Emulator reset.', 'info');

  // Update button states
  if (runBtn) {
    runBtn.disabled = false;
    runBtn.hidden = false;
    runBtn.innerHTML = '<span class="btn-icon">▶️</span> Run';
  }
  if (pauseBtn) {
    pauseBtn.hidden = true;
  }
}

function handleDownload() {
  if (!app.compiledRom) {
    log('No ROM compiled yet.', 'warning');
    return;
  }
  downloadROM(app.compiledRom, app.currentFile.replace('.c', '.gb'));
  log('ROM downloaded.', 'success');
}

function handleExport() {
  log('Export button clicked. Storage not yet implemented (Phase 4).', 'warning');
}

function handleImport() {
  log('Import button clicked. Storage not yet implemented (Phase 4).', 'warning');
  // document.getElementById('file-input').click();
}

function handleNewFile() {
  log('New file button clicked. File management not yet implemented (Phase 6).', 'warning');
}

function handleFileInputChange(e) {
  const file = e.target.files[0];
  if (file) {
    log(`Selected file: ${file.name}. Import not yet implemented (Phase 4).`, 'info');
  }
}

/**
 * Console logging utilities
 */
function log(message, type = 'info') {
  const consoleOutput = document.getElementById('console-output');
  if (!consoleOutput) return;

  const line = document.createElement('div');
  line.className = `console-line console-${type}`;
  line.textContent = message;
  consoleOutput.appendChild(line);

  // Auto-scroll to bottom
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
  const consoleOutput = document.getElementById('console-output');
  if (consoleOutput) {
    consoleOutput.innerHTML = '<div class="console-line console-info">Console cleared.</div>';
  }
}

/**
 * Download ROM file
 */
function downloadROM(romData, filename = 'game.gb') {
  const blob = new Blob([romData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`ROM downloaded: ${filename} (${romData.length} bytes)`);
}

/**
 * Loading overlay utilities
 */
function showLoading(message = 'Loading...') {
  const overlay = document.getElementById('loading-overlay');
  const text = overlay?.querySelector('.loading-text');

  if (overlay) {
    overlay.hidden = false;
  }

  if (text) {
    text.textContent = message;
  }
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.hidden = true;
  }
}

/**
 * Start the application when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
