/**
 * GB2GO - Main Application Entry Point
 * Browser-based Game Boy Development IDE
 */

import { GBDKCompiler } from './core/compiler.js';
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

    // TODO: Initialize emulator
    // app.emulator = new GameBoyEmulator();
    // await app.emulator.initialize();

    // Initialize UI
    initUI();

    // Display the default source code
    displaySource();

    // Hide loading overlay
    hideLoading();

    log('GB2GO ready! Compiler initialized and ready to test.', 'success');
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
  // TODO: Send to emulator when implemented
  console.log(`Button ${button}: ${pressed ? 'pressed' : 'released'}`);
}

/**
 * Display source code in editor area
 */
function displaySource() {
  const editorContainer = document.getElementById('editor-container');
  if (!editorContainer) return;

  // For now, just show the code in a textarea
  // TODO: Replace with CodeMirror in Phase 6
  const textarea = document.createElement('textarea');
  textarea.id = 'source-editor';
  textarea.value = app.currentSource;
  textarea.style.cssText = `
    width: 100%;
    height: calc(100% - var(--console-height, 200px));
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
    log('ROM is ready. Emulator integration coming in Phase 5.', 'info');

    // Enable run button
    if (runBtn) runBtn.disabled = false;

  } catch (error) {
    log(`✗ Compilation failed: ${error.message}`, 'error');
    console.error('Compilation error:', error);
  } finally {
    // Re-enable compile button
    if (compileBtn) compileBtn.disabled = false;
  }
}

function handleRun() {
  if (!app.compiledRom) {
    log('No ROM compiled yet. Click "Compile" first.', 'warning');
    return;
  }

  log('Run button clicked. Emulator not yet implemented (Phase 5).', 'warning');
  log(`ROM ready: ${app.compiledRom.length} bytes`, 'info');
}

function handlePause() {
  log('Pause button clicked. Emulator not yet implemented (Phase 5).', 'warning');
}

function handleReset() {
  log('Reset button clicked. Emulator not yet implemented (Phase 5).', 'warning');
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
