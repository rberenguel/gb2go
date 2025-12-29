/**
 * GB2GO - Main Application Entry Point
 * Browser-based Game Boy Development IDE
 */

import { GBDKCompiler } from './core/compiler.js';
import { GameBoyEmulator } from './core/emulator.js';
import { StorageManager } from './core/storage.js';
import { exampleTemplate, minimalTemplate } from './templates/hello-world.js';

// Application state
const app = {
  currentFile: 'main.c',
  currentProject: null, // Will be loaded from storage
  currentSource: '',
  compiledRom: null,
  editor: null,
  compiler: null,
  emulator: null,
  storage: null,
};

/**
 * Initialize the application
 */
async function init() {
  console.log('GB2GO: Initializing...');

  // Show loading overlay
  showLoading('Initializing GB2GO...');

  try {
    // Initialize storage manager
    log('Initializing storage...', 'info');
    app.storage = new StorageManager();
    await app.storage.initialize();

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

    // Load or create default project
    await loadOrCreateProject();

    // Update project name in UI
    updateProjectName();

    // Initialize UI
    initUI();

    // Display the source code
    displaySource();

    // Hide loading overlay
    hideLoading();

    log('GB2GO ready! Compiler and emulator initialized.', 'success');
    log('Click "Compile" to build your project.', 'info');
  } catch (error) {
    console.error('Initialization error:', error);
    hideLoading();
    log(`Initialization error: ${error.message}`, 'error');
  }
}

/**
 * Load existing project or create default project
 */
async function loadOrCreateProject() {
  try {
    // Ensure Example project always exists
    await ensureExampleProject();

    // Try to load the last used project
    const currentProjectId = app.storage.getCurrentProjectId();
    const projects = await app.storage.listProjects();

    if (currentProjectId) {
      try {
        app.currentProject = await app.storage.loadProject(currentProjectId);
        app.currentSource = app.currentProject.files[app.currentFile] || '';
        log(`Loaded project: ${app.currentProject.name}`, 'success');
        return;
      } catch (error) {
        console.warn('Failed to load last project:', error);
      }
    }

    // Load most recent project
    if (projects.length > 0) {
      app.currentProject = await app.storage.loadProject(projects[0].id);
      app.currentSource = app.currentProject.files[app.currentFile] || '';
      log(`Loaded project: ${app.currentProject.name}`, 'success');
    } else {
      // No projects exist - this shouldn't happen due to ensureExampleProject
      console.error('No projects found despite ensureExampleProject');
      app.currentProject = exampleTemplate;
      app.currentSource = exampleTemplate.files[app.currentFile];
    }
  } catch (error) {
    console.error('Failed to load/create project:', error);
    log(`Error loading project: ${error.message}`, 'error');
    app.currentProject = exampleTemplate;
    app.currentSource = exampleTemplate.files[app.currentFile];
  }
}

/**
 * Ensure the Example project always exists
 */
async function ensureExampleProject() {
  const projects = await app.storage.listProjects();
  const exampleExists = projects.some((p) => p.name === 'Example');

  if (!exampleExists) {
    console.log('Example project not found, creating it...');
    await app.storage.createProject('Example', exampleTemplate);
    log('Created Example project', 'info');
  }
}

/**
 * Save current file to storage
 */
async function saveCurrentFile() {
  if (!app.storage || !app.currentProject || !app.currentProject.id) {
    console.warn('Cannot save: storage or project not initialized');
    return;
  }

  try {
    await app.storage.saveFile(app.currentProject.id, app.currentFile, app.currentSource);
    console.log(`Auto-saved ${app.currentFile}`);
  } catch (error) {
    console.error('Failed to save file:', error);
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
  document.getElementById('btn-export')?.addEventListener('click', handleExport);

  // Import button
  document.getElementById('btn-import')?.addEventListener('click', handleImport);

  // API Info button
  document.getElementById('btn-api-info')?.addEventListener('click', handleApiInfo);

  // About button
  document.getElementById('btn-about')?.addEventListener('click', handleAbout);

  // Project switcher button
  document.getElementById('btn-project-switcher')?.addEventListener('click', handleProjectSwitcher);

  // New file button
  document.getElementById('btn-new-file')?.addEventListener('click', handleNewFile);

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

  // Initialize File Browser
  updateFileBrowser();

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

  buttons.forEach((button) => {
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
      EditorState,
      EditorView,
      keymap,
      defaultKeymap,
      history,
      historyKeymap,
      oneDark,
      languages,
      Decoration,
      ViewPlugin,
    } = await import('CodeMirrorBundle');

    // Active Line Plugin (Custom implementation since it's missing from bundle)
    const activeLineHighlighter = ViewPlugin.fromClass(
      class {
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
              decos.push(Decoration.line({ class: 'cm-activeLine' }).range(line.from));
            }
          }
          // Decoration.set requires sorted decorations
          decos.sort((a, b) => a.from - b.from);
          return Decoration.set(decos);
        }
      },
      {
        decorations: (v) => v.decorations,
      }
    );

    // Build extensions
    const extensions = [
      oneDark,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      activeLineHighlighter,
      EditorView.theme({
        '&': { height: '100%', backgroundColor: '#1e1e1e !important' },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: "'Monoid', 'SF Mono', monospace !important",
        },
        '.cm-content': {
          backgroundColor: '#1e1e1e !important',
          fontFamily: "'Monoid', 'SF Mono', monospace !important",
        },
        '.cm-gutters': { backgroundColor: '#1e1e1e !important', borderRight: '1px solid #2d2d30' },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          app.currentSource = update.state.doc.toString();
          // Auto-save with debounce
          clearTimeout(app.saveTimeout);
          app.saveTimeout = setTimeout(() => saveCurrentFile(), 1000);
        }
      }),
    ];

    // Try to load C/C++ syntax highlighting
    try {
      // Look for C or C++ in the languages list (standard CM6 language-data uses 'C++')
      const cLang = languages.find(
        (l) => l.name === 'C++' || l.alias.includes('c') || l.alias.includes('cpp')
      );
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
      extensions: extensions,
    });

    app.editor = new EditorView({
      state,
      parent: editorContainer,
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
      // Auto-save with debounce
      clearTimeout(app.saveTimeout);
      app.saveTimeout = setTimeout(() => saveCurrentFile(), 1000);
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

    // Get all .c files from the project
    const cFiles = Object.keys(app.currentProject.files).filter((path) => path.endsWith('.c'));

    if (cFiles.length === 0) {
      log('No .c files found in project!', 'error');
      return;
    }

    log(`Found ${cFiles.length} C source file(s): ${cFiles.join(', ')}`, 'info');

    // If only one file, use simple compilation
    if (cFiles.length === 1) {
      const filename = cFiles[0];
      const source = app.currentProject.files[filename];

      log(`Compiling ${filename}...`, 'info');
      const romData = await app.compiler.compile({
        source: source,
        filename: filename,
      });

      app.compiledRom = romData;
    } else {
      // Multi-file compilation
      log(`Compiling multi-file project...`, 'info');

      // For multi-file projects, we need to pass all sources to the compiler
      // The compiler needs to be updated to handle this, but for now we'll
      // compile with all sources combined in the VFS
      const allSources = {};
      for (const filename of cFiles) {
        allSources[filename] = app.currentProject.files[filename];
      }

      // Find main.c or use first file as entry point
      const mainFile = cFiles.includes('main.c') ? 'main.c' : cFiles[0];
      log(`Using ${mainFile} as entry point`, 'info');

      const romData = await app.compiler.compile({
        source: app.currentProject.files[mainFile],
        filename: mainFile,
        additionalSources: allSources, // Pass all sources
      });

      app.compiledRom = romData;
    }

    // app.compiledRom is already set above

    log(`✓ ROM compiled successfully! (${app.compiledRom.length} bytes)`, 'success');

    // Debug: Show ROM entry point
    const entryBytes = Array.from(app.compiledRom.slice(0x100, 0x104))
      .map((b) => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    log(`Entry point (0x0100): ${entryBytes}`, 'info');

    // Verify header checksum
    let checksum = 0;
    for (let i = 0x0134; i <= 0x014c; i++) {
      checksum = checksum - app.compiledRom[i] - 1;
    }
    const isValid = (checksum & 0xff) === app.compiledRom[0x014d];
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
      runBtn.innerHTML = '<i class="iconoir-play"></i>';
      runBtn.title = 'Resume emulator';
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
    runBtn.innerHTML = '<i class="iconoir-play"></i>';
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

async function handleExport() {
  if (!app.storage || !app.currentProject) {
    log('No project to export.', 'warning');
    return;
  }

  try {
    log('Exporting project as ZIP...', 'info');
    const zipBlob = await app.storage.exportProjectAsZip(app.currentProject.id);
    const filename = `${app.currentProject.name.replace(/[^a-z0-9]/gi, '_')}.zip`;
    app.storage.downloadBlob(zipBlob, filename);
    log(`Project exported as ${filename}`, 'success');
  } catch (error) {
    log(`Export failed: ${error.message}`, 'error');
    console.error('Export error:', error);
  }
}

function handleImport() {
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.click();
  }
}

function handleNewFile() {
  showNewFileDialog();
}

async function handleFileInputChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.zip')) {
    log('Please select a ZIP file.', 'error');
    return;
  }

  try {
    log(`Importing project from ${file.name}...`, 'info');
    const project = await app.storage.importProjectFromZip(file);
    app.currentProject = project;
    app.currentFile = 'main.c';
    app.currentSource = project.files[app.currentFile] || '';

    // Refresh editor
    displaySource();

    // Update file browser
    updateFileBrowser();

    log(`Project "${project.name}" imported successfully!`, 'success');
  } catch (error) {
    log(`Import failed: ${error.message}`, 'error');
    console.error('Import error:', error);
  }

  // Clear file input
  e.target.value = '';
}

function handleAbout() {
  const modal = document.getElementById('about-modal');
  const closeBtn = document.getElementById('close-about');
  const versionEl = document.getElementById('about-version');
  const copyrightYearEl = document.getElementById('copyright-year');

  if (!modal) return;

  // Show modal
  modal.classList.remove('hidden');

  // Set copyright year
  if (copyrightYearEl) copyrightYearEl.textContent = new Date().getFullYear();

  // Fetch version from manifest if not already set
  if (versionEl && versionEl.textContent === 'Version ...') {
    fetch('manifest.json')
      .then((response) => response.json())
      .then((data) => {
        versionEl.textContent = `Version ${data.version || '1.0.0'}`;
      })
      .catch((err) => {
        console.error('Failed to fetch manifest:', err);
        versionEl.textContent = 'Version 1.0.0';
      });
  }

  // Close logic
  const closeModal = () => modal.classList.add('hidden');

  if (closeBtn) closeBtn.onclick = closeModal;

  // Close on click outside
  window.onclick = (event) => {
    if (event.target === modal) {
      closeModal();
    }
  };
}

/**
 * Update file browser with current project files
 */
function updateFileBrowser() {
  const fileBrowser = document.getElementById('file-browser');
  if (!fileBrowser || !app.currentProject) return;

  fileBrowser.innerHTML = '';

  const files = app.currentProject.files || {};
  const filePaths = Object.keys(files).sort();

  if (filePaths.length === 0) {
    fileBrowser.innerHTML = '<div style="padding: 10px; color: #888;">No files in project</div>';
    return;
  }

  for (const path of filePaths) {
    const item = document.createElement('div');
    item.className = 'file-tree-item';
    if (path === app.currentFile) {
      item.classList.add('active');
    }

    // Determine icon based on file extension
    const ext = path.split('.').pop().toLowerCase();
    let icon = '📄';
    if (ext === 'c') icon = '📄';
    else if (ext === 'h') icon = '📋';
    else if (ext === 'asm' || ext === 's') icon = '⚙️';
    else if (ext === 'txt' || ext === 'md') icon = '📝';

    item.innerHTML = `
      <span style="margin-right: 5px;">${icon}</span>
      <span class="file-name">${path}</span>
      <span class="file-actions" style="margin-left: auto; opacity: 0; transition: opacity 0.2s;">
        <button class="btn-icon-small btn-rename" title="Rename" style="padding: 2px 4px;">✎</button>
        <button class="btn-icon-small btn-file-delete" title="Delete" style="padding: 2px 4px;">×</button>
      </span>
    `;

    // Show actions on hover
    item.addEventListener('mouseenter', () => {
      const actions = item.querySelector('.file-actions');
      if (actions) actions.style.opacity = '1';
    });

    item.addEventListener('mouseleave', () => {
      const actions = item.querySelector('.file-actions');
      if (actions) actions.style.opacity = '0';
    });

    // Click to open file
    item.addEventListener('click', (e) => {
      // Don't switch if clicking action buttons
      if (e.target.closest('.file-actions')) return;
      switchToFile(path);
    });

    // Rename button
    const renameBtn = item.querySelector('.btn-rename');
    if (renameBtn) {
      renameBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleFileRename(path);
      });
    }

    // Delete button
    const deleteBtn = item.querySelector('.btn-file-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleFileDelete(path);
      });
    }

    fileBrowser.appendChild(item);
  }
}

/**
 * Handle file deletion
 */
async function handleFileDelete(path) {
  showConfirmModal(`Delete "${path}"? This cannot be undone!`, async () => {

  try {
    // Delete from storage
    await app.storage.deleteFile(app.currentProject.id, path);

    // Delete from in-memory project
    delete app.currentProject.files[path];

    log(`Deleted file: ${path}`, 'success');

    // If we deleted the current file, switch to another one
    if (path === app.currentFile) {
      const remainingFiles = Object.keys(app.currentProject.files);
      if (remainingFiles.length > 0) {
        await switchToFile(remainingFiles[0]);
      } else {
        app.currentFile = '';
        app.currentSource = '';
        if (app.editor) {
          app.editor.dispatch({
            changes: { from: 0, to: app.editor.state.doc.length, insert: '' },
          });
        }
      }
    }

    // Update file browser
    updateFileBrowser();
  } catch (error) {
    log(`Failed to delete file: ${error.message}`, 'error');
    console.error('File deletion error:', error);
  }
  });
}

/**
 * Handle file rename
 */
async function handleFileRename(oldPath) {
  const newPath = prompt(`Rename "${oldPath}" to:`, oldPath);

  if (!newPath || newPath === oldPath) {
    return;
  }

  // Validate new name
  if (!newPath.trim()) {
    log('File name cannot be empty', 'error');
    return;
  }

  // Check if new name already exists
  if (app.currentProject.files[newPath]) {
    log(`File "${newPath}" already exists!`, 'error');
    return;
  }

  try {
    // Get file content
    const content = app.currentProject.files[oldPath];

    // Save with new name
    await app.storage.saveFile(app.currentProject.id, newPath, content);

    // Delete old file
    await app.storage.deleteFile(app.currentProject.id, oldPath);

    // Update in-memory project
    app.currentProject.files[newPath] = content;
    delete app.currentProject.files[oldPath];

    // If this was the current file, update current file reference
    if (app.currentFile === oldPath) {
      app.currentFile = newPath;

      // Update file name display
      const fileNameEl = document.getElementById('current-file-name');
      if (fileNameEl) {
        fileNameEl.textContent = newPath;
      }
    }

    log(`Renamed "${oldPath}" to "${newPath}"`, 'success');

    // Update file browser
    updateFileBrowser();
  } catch (error) {
    log(`Failed to rename file: ${error.message}`, 'error');
    console.error('File rename error:', error);
  }
}

/**
 * Switch to a different file in the project
 */
async function switchToFile(path) {
  if (!app.currentProject || !app.currentProject.files[path]) {
    log(`File not found: ${path}`, 'error');
    return;
  }

  // Save current file before switching
  if (app.currentFile && app.currentSource) {
    await saveCurrentFile();
  }

  // Switch to new file
  app.currentFile = path;
  app.currentSource = app.currentProject.files[path];

  // Update file name display
  const fileNameEl = document.getElementById('current-file-name');
  if (fileNameEl) {
    fileNameEl.textContent = path;
  }

  // Update file browser
  updateFileBrowser();

  // Update editor content
  if (app.editor) {
    app.editor.dispatch({
      changes: { from: 0, to: app.editor.state.doc.length, insert: app.currentSource },
    });
  } else {
    // Fallback for textarea
    const textarea = document.getElementById('source-editor');
    if (textarea) {
      textarea.value = app.currentSource;
    }
  }

  log(`Switched to ${path}`, 'info');
}

/**
 * Handle API Info Modal
 */
function handleApiInfo() {
  const modal = document.getElementById('api-modal');
  const closeBtn = document.getElementById('close-api');
  const fileList = document.getElementById('api-file-list');
  const rawViewer = document.getElementById('api-content-viewer');
  const docViewer = document.getElementById('api-doc-viewer');
  const searchInput = document.getElementById('api-search');
  const btnViewDoc = document.getElementById('btn-view-doc');
  const btnViewRaw = document.getElementById('btn-view-raw');

  if (!modal || !fileList || !rawViewer || !docViewer) return;

  // State
  let currentFile = null;
  let currentContent = '';
  let viewMode = 'doc'; // 'doc' or 'raw'

  // Show modal
  modal.classList.remove('hidden');

  // Toggle View Function
  const setViewMode = (mode) => {
    viewMode = mode;
    if (mode === 'doc') {
      rawViewer.classList.add('hidden');
      docViewer.classList.remove('hidden');
      btnViewDoc.classList.add('active');
      btnViewRaw.classList.remove('active');
      renderDocView();
    } else {
      docViewer.classList.add('hidden');
      rawViewer.classList.remove('hidden');
      btnViewDoc.classList.remove('active');
      btnViewRaw.classList.add('active');
      rawViewer.textContent = currentContent || 'Select a file';
    }
  };

  // Bind toggle buttons
  if (btnViewDoc) btnViewDoc.onclick = () => setViewMode('doc');
  if (btnViewRaw) btnViewRaw.onclick = () => setViewMode('raw');

  // Header Parser (Simple Heuristic)
  const parseHeaderAndRender = (fileName, content) => {
    // Basic JSDoc-like comment parsing
    // Looks for comments /** ... */ followed by function signatures
    const functions = [];
    let fileDesc = '';

    // Regex for block comments: /\*\*([\s\S]*?)\*\//g
    const comments = [...content.matchAll(/\/\*\*([\s\S]*?)\*\//g)];

    // Heuristic: The first comment is often the file description, especially if at the top
    if (comments.length > 0 && comments[0].index < 50) {
      fileDesc = comments[0][1]
        .replace(/\r/g, '')
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').trim())
        .join(' ')
        .trim();
    }

    // Heuristic for functions: looks for return type + name + ( args )
    // This is hard to do perfectly with regex, so we'll accept some margin of error
    // Strategy: Look for lines ending with ); or ) NONBANKED;
    const lines = content.split('\n');
    let lastComment = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if line is end of a block comment
      if (line.endsWith('*/')) {
        // Backtrack to find start of comment
        for (let j = i; j >= 0; j--) {
          if (lines[j].trim().startsWith('/**')) {
            lastComment = lines
              .slice(j, i + 1)
              .join('\n')
              .replace(/\/\*\*|^\s*\*\s?|\*\//gm, '') // Strip comment markers
              .trim();
            break;
          }
        }
      }

      // Check for function signature
      // Example: void set_bkg_data(uint8_t first_tile, uint8_t nb_tiles, const uint8_t *data) NONBANKED;
      if (
        line.includes('(') &&
        line.includes(')') &&
        line.endsWith(';') &&
        !line.startsWith('#') &&
        !line.startsWith('//') &&
        !line.startsWith('typedef')
      ) {
        // It's likely a function
        // Clean up signature
        const signature = line;

        // Extract name
        const match = signature.match(/(\w+)\s*\(/);
        const name = match ? match[1] : 'unknown';

        // Use last found comment if it's close (within 5 lines above)
        // simplified: just use lastComment if non-null, then reset it
        let desc = lastComment || 'No description available.';

        // Clean tags from desc
        desc = desc.replace(/@param\s+\w+/g, '\nparam:').replace(/@return/g, '\nreturn:');

        functions.push({
          name,
          signature,
          description: desc,
          isNonBanked: signature.includes('NONBANKED'),
        });

        lastComment = null; // Reset
      }
    }

    // Render Logic
    docViewer.innerHTML = '';

    const headerEl = document.createElement('div');
    headerEl.className = 'doc-file-header';
    headerEl.innerHTML = `
      <div class="doc-file-title">${fileName}</div>
      <div class="doc-file-desc">${fileDesc || 'Official GBDK Header File'}</div>
    `;
    docViewer.appendChild(headerEl);

    if (functions.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.padding = '20px';
      emptyMsg.style.color = '#888';
      emptyMsg.textContent = 'No functions detected (or parser failed). Try "Raw Source" view.';
      docViewer.appendChild(emptyMsg);
      return;
    }

    functions.forEach((fn) => {
      const card = document.createElement('div');
      card.className = 'doc-function-card';

      let badges = '';
      if (fn.isNonBanked) {
        badges += '<span class="doc-tag doc-tag-nonbanked">NONBANKED</span>';
      }

      // Highlight function name in signature
      const highlightedSig = fn.signature.replace(
        fn.name,
        `<span class="doc-func-name">${fn.name}</span>`
      );

      card.innerHTML = `
            ${badges}
            <div class="doc-func-sig">${highlightedSig}</div>
            <div class="doc-func-desc">${fn.description}</div>
        `;
      docViewer.appendChild(card);
    });
  };

  const renderDocView = () => {
    if (currentFile && currentContent) {
      parseHeaderAndRender(currentFile, currentContent);
    } else {
      docViewer.innerHTML =
        '<div class="placeholder-text">Select a header file to view its content</div>';
    }
  };

  // Logic to populate files
  if (fileList.children.length === 0) {
    if (app.compiler && app.compiler.vfs && app.compiler.vfs.headers) {
      const headers = app.compiler.vfs.headers;
      const sortedPaths = Object.keys(headers).sort();

      const populateList = (filter = '') => {
        fileList.innerHTML = '';
        const term = filter.toLowerCase();

        sortedPaths.forEach((path) => {
          // Search in path OR content
          const content = headers[path] || '';
          if (term && !path.toLowerCase().includes(term) && !content.toLowerCase().includes(term)) {
            return;
          }

          const item = document.createElement('div');
          item.className = 'api-file-item';
          item.textContent = path;
          item.onclick = () => {
            // Highlight active item
            document
              .querySelectorAll('.api-file-item')
              .forEach((el) => el.classList.remove('active'));
            item.classList.add('active');

            // Load Content
            currentFile = path;
            currentContent = headers[path];

            // Refresh View
            if (viewMode === 'doc') {
              renderDocView();
            } else {
              rawViewer.textContent = currentContent;
            }
          };
          fileList.appendChild(item);
        });
      };

      // Initial populate
      populateList();
      setViewMode('doc'); // Default to doc view

      // Search functionality
      if (searchInput) {
        searchInput.oninput = (e) => populateList(e.target.value);
        searchInput.focus();
      }
    } else {
      fileList.innerHTML =
        '<div style="padding: 10px; color: #888;">No GBDK headers available. Initialize compiler first.</div>';
    }
  }

  // Close logic (re-bind to fix scope issues)
  const closeModal = () => modal.classList.add('hidden');
  if (closeBtn) closeBtn.onclick = closeModal;

  // Window click logic
  const oldOnClick = window.onclick;
  window.onclick = (event) => {
    if (oldOnClick) oldOnClick(event);
    if (event.target === modal) {
      closeModal();
    }
  };
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
 * Show New File Dialog
 */
function showNewFileDialog() {
  const modal = document.getElementById('new-file-modal');
  const form = document.getElementById('new-file-form');
  const nameInput = document.getElementById('new-file-name');
  const templateSelect = document.getElementById('new-file-template');
  const closeBtn = document.getElementById('close-new-file');
  const cancelBtn = document.getElementById('cancel-new-file');

  if (!modal || !form) return;

  // Show modal
  modal.classList.remove('hidden');
  nameInput.value = '';
  nameInput.focus();

  // Close handlers
  const closeModal = () => {
    modal.classList.add('hidden');
    form.removeEventListener('submit', handleSubmit);
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    const filename = nameInput.value.trim();
    const template = templateSelect.value;

    if (!filename) {
      log('Please enter a file name', 'error');
      return;
    }

    // Check if file already exists
    if (app.currentProject.files[filename]) {
      log(`File "${filename}" already exists!`, 'error');
      return;
    }

    // Get template content
    let content = '';
    if (template === 'c-source') {
      content = `#include <gb/gb.h>\n\nvoid ${filename.replace('.c', '')}(void) {\n    // TODO: Implement function\n}\n`;
    } else if (template === 'c-header') {
      const guard = filename.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      content = `#ifndef ${guard}\n#define ${guard}\n\n// TODO: Add declarations\n\n#endif // ${guard}\n`;
    }

    try {
      // Add file to project
      app.currentProject.files[filename] = content;
      await app.storage.saveFile(app.currentProject.id, filename, content);

      log(`Created file: ${filename}`, 'success');
      updateFileBrowser();
      closeModal();

      // Switch to new file
      await switchToFile(filename);
    } catch (error) {
      log(`Failed to create file: ${error.message}`, 'error');
      console.error('File creation error:', error);
    }
  };

  form.addEventListener('submit', handleSubmit);
}

/**
 * Show New Project Dialog
 */
function showNewProjectDialog() {
  const modal = document.getElementById('new-project-modal');
  const form = document.getElementById('new-project-form');
  const nameInput = document.getElementById('new-project-name');
  const templateSelect = document.getElementById('new-project-template');
  const closeBtn = document.getElementById('close-new-project');
  const cancelBtn = document.getElementById('cancel-new-project');

  if (!modal || !form) return;

  // Show modal
  modal.classList.remove('hidden');
  nameInput.value = '';
  nameInput.focus();

  // Close handlers
  const closeModal = () => {
    modal.classList.add('hidden');
    form.removeEventListener('submit', handleSubmit);
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    const projectName = nameInput.value.trim();
    const template = templateSelect.value;

    if (!projectName) {
      log('Please enter a project name', 'error');
      return;
    }

    try {
      let newProject;
      if (template === 'example') {
        newProject = await app.storage.createProject(projectName, exampleTemplate);
      } else if (template === 'minimal') {
        newProject = await app.storage.createProject(projectName, minimalTemplate);
      } else {
        // Empty project - completely blank
        newProject = await app.storage.createProject(projectName, {
          name: projectName,
          files: {
            'main.c': `#include <gb/gb.h>\n\nvoid main(void) {\n    // TODO: Add your code here\n}\n`,
          },
        });
      }

      // Load the new project
      app.currentProject = await app.storage.loadProject(newProject.id);
      app.currentFile = 'main.c';
      app.currentSource = app.currentProject.files[app.currentFile];

      // Update UI
      updateProjectName();
      updateFileBrowser();
      displaySource();

      log(`Created project: ${projectName}`, 'success');
      closeModal();

      // Close project switcher if open
      const switcherModal = document.getElementById('project-switcher-modal');
      if (switcherModal) {
        switcherModal.classList.add('hidden');
      }
    } catch (error) {
      log(`Failed to create project: ${error.message}`, 'error');
      console.error('Project creation error:', error);
    }
  };

  form.addEventListener('submit', handleSubmit);
}

/**
 * Show Project Switcher Dialog
 */
async function handleProjectSwitcher() {
  const modal = document.getElementById('project-switcher-modal');
  const projectList = document.getElementById('project-list');
  const closeBtn = document.getElementById('close-project-switcher');
  const newProjectBtn = document.getElementById('btn-open-new-project');

  if (!modal || !projectList) return;

  // Show modal
  modal.classList.remove('hidden');

  // Close handler
  const closeModal = () => modal.classList.add('hidden');
  if (closeBtn) closeBtn.onclick = closeModal;
  if (newProjectBtn) {
    newProjectBtn.onclick = () => {
      closeModal();
      showNewProjectDialog();
    };
  }

  // Load and display projects
  try {
    const projects = await app.storage.listProjects();

    if (projects.length === 0) {
      projectList.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">No projects yet. Create one to get started!</div>';
      return;
    }

    projectList.innerHTML = '';

    for (const project of projects) {
      const item = document.createElement('div');
      item.className = 'project-item';
      if (app.currentProject && project.id === app.currentProject.id) {
        item.classList.add('active');
      }

      const updatedDate = new Date(project.updatedAt).toLocaleDateString();

      item.innerHTML = `
        <div class="project-item-name">${project.name}</div>
        <div class="project-item-meta">Last updated: ${updatedDate}</div>
        <div class="project-item-actions">
          <button class="btn btn-sm btn-delete" data-project-id="${project.id}">Delete</button>
        </div>
      `;

      // Click to switch project
      item.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) return; // Don't switch when clicking delete

        try {
          app.currentProject = await app.storage.loadProject(project.id);
          app.currentFile = 'main.c';
          app.currentSource = app.currentProject.files[app.currentFile] || '';

          // Update UI
          updateProjectName();
          updateFileBrowser();
          displaySource();

          log(`Switched to project: ${project.name}`, 'success');
          closeModal();
        } catch (error) {
          log(`Failed to load project: ${error.message}`, 'error');
        }
      });

      // Delete button handler
      const deleteBtn = item.querySelector('.btn-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();

          const isExample = project.name === 'Example';
          const message = `Delete project "${project.name}"?${isExample ? ' It will be recreated from the template.' : ' This cannot be undone!'}`;

          showConfirmModal(message, async () => {
            try {
              await app.storage.deleteProject(project.id);
              log(`Deleted project: ${project.name}`, 'success');

              // If we deleted Example, recreate it from template
              if (isExample) {
                await app.storage.createProject('Example', exampleTemplate);
                log('Example project recreated from template', 'info');
              }

              // Refresh project list
              handleProjectSwitcher();
            } catch (error) {
              log(`Failed to delete project: ${error.message}`, 'error');
            }
          });
        });
      }

      projectList.appendChild(item);
    }
  } catch (error) {
    log(`Failed to load projects: ${error.message}`, 'error');
    projectList.innerHTML = '<div style="padding: 20px; color: #f48771;">Error loading projects</div>';
  }
}

/**
 * Update project name in toolbar
 */
function updateProjectName() {
  const nameEl = document.getElementById('current-project-name');
  if (nameEl && app.currentProject) {
    nameEl.textContent = app.currentProject.name;
  }
}

/**
 * Show confirmation modal
 */
function showConfirmModal(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const messageEl = document.getElementById('confirm-message');
  const yesBtn = document.getElementById('confirm-yes');
  const noBtn = document.getElementById('confirm-no');
  const closeBtn = document.getElementById('close-confirm');

  if (!modal || !messageEl) return;

  messageEl.textContent = message;
  modal.classList.remove('hidden');

  const closeModal = () => {
    modal.classList.add('hidden');
    yesBtn.onclick = null;
    noBtn.onclick = null;
    closeBtn.onclick = null;
  };

  yesBtn.onclick = () => {
    closeModal();
    onConfirm();
  };

  noBtn.onclick = closeModal;
  closeBtn.onclick = closeModal;
}

/**
 * Start the application when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
