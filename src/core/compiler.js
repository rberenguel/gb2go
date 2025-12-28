/**
 * GBDKCompiler - GBDK Compilation Pipeline
 *
 * Orchestrates the complete Game Boy development compilation process:
 * 1. Compile: sdcc (C to assembly, includes preprocessing)
 * 2. Assemble: as-gbz80 (assembly to object code)
 * 3. Link: link-gbz80 (object files to Intel HEX)
 * 4. Convert: IHX to .gb ROM format
 *
 * Uses WASM modules from gbdk-emscripten via Emscripten's FS API.
 * Modules are loaded on-demand to avoid conflicts in the WebAssembly runtime.
 */

import { VirtualFS } from './vfs.js';

export class GBDKCompiler {
  constructor() {
    // Virtual filesystem manager
    this.vfs = new VirtualFS();

    // WASM modules
    this.modules = {
      sdcpp: null,    // C preprocessor
      sdcc: null,     // C compiler
      assembler: null, // as-gbz80 assembler
      linker: null    // link-gbz80 linker
    };

    // Compilation state
    this.isInitialized = false;
    this.isCompiling = false;

    // Compilation callbacks
    this.onProgress = null;
    this.onLog = null;
    this.onError = null;

    console.log('GBDKCompiler: Created');
  }

  /**
   * Initialize the compiler by loading all WASM modules
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('GBDKCompiler: Already initialized');
      return;
    }

    console.log('GBDKCompiler: Initializing...');
    this._log('Initializing GBDK compiler...', 'info');

    try {
      // Don't load WASM modules yet - load them on-demand to avoid conflicts
      // Emscripten WASM modules overwrite each other when loaded simultaneously

      this._progress('Initialization complete', 100);
      this.isInitialized = true;

      this._log('GBDK compiler initialized successfully', 'success');
      console.log('GBDKCompiler: Initialization complete');
    } catch (error) {
      this._error(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure a WASM module is loaded (always reload for clean state)
   * @private
   */
  async _ensureModuleLoaded(moduleName) {
    const moduleMap = {
      'sdcpp': './lib/wasm/sdcpp.js',
      'sdcc': './lib/wasm/sdcc.js',
      'assembler': './lib/wasm/as-gbz80.js',
      'linker': './lib/wasm/link-gbz80.js'
    };

    const jsPath = moduleMap[moduleName];
    if (!jsPath) {
      throw new Error(`Unknown module: ${moduleName}`);
    }

    // Always reload the module to ensure clean state
    // Emscripten modules can't be reliably reused after calling main()
    this._log(`Loading ${moduleName}...`, 'info');
    const module = await this._loadWasmModule(jsPath, moduleName);
    this.modules[moduleName] = module;

    // Initialize VFS for this module
    this.vfs.initModule(module, moduleName);

    // Preload resources if not already loaded
    if (!this.vfs.headers || !this.vfs.libraries) {
      await this.vfs.preloadResources();
    } else {
      // Preload resources into this new module
      this.vfs._preloadResourcesIntoModule(module, moduleName);
    }

    return this.modules[moduleName];
  }

  /**
   * Compile a C source file to a Game Boy ROM
   * @param {Object} options - Compilation options
   * @param {string} options.source - C source code
   * @param {string} options.filename - Source filename (e.g., 'main.c')
   * @returns {Promise<Uint8Array>} Compiled ROM data
   */
  async compile(options) {
    if (!this.isInitialized) {
      throw new Error('Compiler not initialized. Call initialize() first.');
    }

    if (this.isCompiling) {
      throw new Error('Compilation already in progress');
    }

    this.isCompiling = true;

    try {
      const { source, filename = 'main.c' } = options;

      this._log(`Compiling ${filename}...`, 'info');
      console.log('GBDKCompiler: Starting compilation');

      // Step 1: Preprocess with sdcpp (sdcc can't invoke it as subprocess in WASM)
      this._progress('Preprocessing...', 20);
      const preprocessed = await this._preprocess(source, filename);

      // Step 2: Compile preprocessed code to assembly with sdcc --c1mode
      this._progress('Compiling to assembly...', 40);
      const assembly = await this._compileToAssembly(preprocessed, filename);

      // Step 2: Assemble to object code (as-gbz80)
      this._progress('Assembling...', 50);
      const objectFile = await this._assemble(assembly, filename);

      // Step 3: Link to Intel HEX (link-gbz80)
      this._progress('Linking...', 70);
      const ihxFile = await this._link(objectFile, filename);

      // Step 4: Convert IHX to GB ROM
      this._progress('Generating ROM...', 90);
      const romData = await this._ihxToRom(ihxFile);

      this._progress('Compilation complete', 100);
      this._log('Compilation successful!', 'success');

      console.log('GBDKCompiler: Compilation complete');

      return romData;
    } catch (error) {
      this._error(`Compilation failed: ${error.message}`);
      console.error('GBDKCompiler: Compilation failed:', error);
      throw error;
    } finally {
      this.isCompiling = false;
    }
  }

  /**
   * Step 1: Preprocess C source with sdcpp
   * @private
   */
  async _preprocess(source, filename) {
    this._log('Running preprocessor...', 'info');

    const inputFile = `/src/${filename}`;
    const outputFile = `/tmp/${filename}.i`;

    try {
      // Ensure sdcpp is loaded
      const sdcpp = await this._ensureModuleLoaded('sdcpp');

      // Write source to VFS
      this.vfs.writeFile('sdcpp', inputFile, source);
      console.log(`Written ${inputFile} to sdcpp VFS`);

      // Check if file exists
      if (!this.vfs.fileExists('sdcpp', inputFile)) {
        throw new Error(`Failed to write input file ${inputFile}`);
      }

      // Run sdcpp with -o flag for output
      const args = [
        '-I/include',
        '-I/include/gb',
        '-o', outputFile,
        inputFile
      ];

      console.log(`Running sdcpp with args:`, args);
      const result = this._runModule(sdcpp, 'sdcpp', args);
      console.log(`sdcpp result:`, result);

      // Check if output file was created
      if (!this.vfs.fileExists('sdcpp', outputFile)) {
        // List files to debug
        const tmpFiles = this.vfs.listFiles('sdcpp', '/tmp');
        console.log('Files in /tmp:', tmpFiles);
        throw new Error(`Preprocessor did not create output file ${outputFile}`);
      }

      // Read preprocessed output
      const preprocessed = this.vfs.readFile('sdcpp', outputFile);

      this._log('Preprocessing complete', 'success');
      return preprocessed;
    } catch (error) {
      console.error('Preprocessing error:', error);
      throw new Error(`Preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Compile preprocessed C to assembly with sdcc --c1mode
   * @private
   */
  async _compileToAssembly(preprocessedSource, filename) {
    this._log('Compiling to assembly...', 'info');

    const baseName = filename.replace(/\.c$/, '');
    const inputFile = `/src/${baseName}.i`;  // Preprocessed file
    const outputFile = `/src/${baseName}.asm`;

    try {
      // Ensure sdcc is loaded
      const sdcc = await this._ensureModuleLoaded('sdcc');

      // Write preprocessed source to VFS
      this.vfs.writeFile('sdcc', inputFile, preprocessedSource);
      console.log(`Written ${inputFile} to sdcc VFS`);

      // Change to /src so sdcc outputs files there
      sdcc.FS.chdir('/src');
      console.log('Changed working directory to:', sdcc.FS.cwd());

      // Run sdcc in c1 mode (input is preprocessed, output is assembly)
      // This prevents sdcc from trying to invoke sdcpp as a subprocess
      const args = [
        '-mgbz80',
        '--c1mode',  // Input is preprocessed code, output is assembly
        `${baseName}.i`  // Relative path since we're in /src
      ];

      console.log(`Running sdcc with args:`, args);
      this._runModule(sdcc, 'sdcc', args);

      // Debug: list files in various directories after compilation
      const srcFilesAfter = this.vfs.listFiles('sdcc', '/src');
      console.log('Files in /src after compilation:', srcFilesAfter);

      // Check for unexpected filenames
      for (const file of srcFilesAfter) {
        if (file !== 'main.c' && file !== 'main.i') {
          console.log(`Found unexpected file: ${file}, checking contents...`);
          const content = this.vfs.readFile('sdcc', `/src/${file}`);
          console.log(`Content of ${file} (first 200 chars):`, content.substring(0, 200));

          // If it looks like assembly, use it
          if (content.includes('.area') || content.includes('.globl') || content.includes(';')) {
            console.log(`${file} appears to be assembly output!`);
            this._log('Assembly generation complete', 'success');
            return content;
          }
        }
      }

      // Check if expected output file was created
      if (!this.vfs.fileExists('sdcc', outputFile)) {
        throw new Error(`sdcc did not create expected output file ${outputFile}. Files in /src: ${srcFilesAfter.join(', ')}`);
      }

      // Read assembly output (sdcc creates it in the same dir as source)
      const assembly = this.vfs.readFile('sdcc', outputFile);

      this._log('Assembly generation complete', 'success');
      return assembly;
    } catch (error) {
      console.error('Compilation error:', error);
      throw new Error(`Compilation to assembly failed: ${error.message}`);
    }
  }

  /**
   * Step 2: Assemble to object code with as-gbz80
   * @private
   */
  async _assemble(assembly, filename) {
    this._log('Assembling object code...', 'info');

    const baseName = filename.replace(/\.c$/, '');
    const inputFile = `/src/${baseName}.asm`;
    const outputFile = `/build/${baseName}.o`;

    try {
      // Ensure assembler is loaded
      const assembler = await this._ensureModuleLoaded('assembler');

      // Write assembly to VFS
      this.vfs.writeFile('assembler', inputFile, assembly);
      console.log(`Written ${inputFile} to assembler VFS`);

      // Run as-gbz80
      const args = [
        '-plosgff',
        outputFile,
        inputFile
      ];

      console.log(`Running as-gbz80 with args:`, args);
      this._runModule(assembler, 'as-gbz80', args);

      // Read object file (binary)
      const objectFile = this.vfs.readFile('assembler', outputFile, true);

      this._log('Assembly complete', 'success');
      return objectFile;
    } catch (error) {
      console.error('Assembly error:', error);
      throw new Error(`Assembly failed: ${error.message}`);
    }
  }

  /**
   * Step 3: Link object files to Intel HEX with link-gbz80
   * @private
   */
  async _link(objectFile, filename) {
    this._log('Linking...', 'info');

    const baseName = filename.replace(/\.c$/, '');
    const objectPath = `/build/${baseName}.o`;
    const outputFile = `/build/${baseName}.ihx`;

    try {
      // Ensure linker is loaded
      const linker = await this._ensureModuleLoaded('linker');

      // Write object file to VFS
      this.vfs.writeFile('linker', objectPath, objectFile);
      console.log(`Written ${objectPath} to linker VFS`);

      // Change to /build directory for linking
      linker.FS.chdir('/build');
      console.log('Changed linker working directory to:', linker.FS.cwd());

      // Run link-gbz80
      // Try with -- for non-interactive command line input
      const args = [
        '--',            // Non-interactive command line input
        '-i',            // Generate Intel HEX format (.ihx)
        baseName,        // Output base name (e.g., 'main')
        `${baseName}.o`  // Input object file
      ];

      console.log(`Running link-gbz80 with args:`, args);
      this._runModule(linker, 'link-gbz80', args);

      // Read IHX file
      const ihxFile = this.vfs.readFile('linker', outputFile);

      this._log('Linking complete', 'success');
      return ihxFile;
    } catch (error) {
      console.error('Linking error:', error);
      throw new Error(`Linking failed: ${error.message}`);
    }
  }

  /**
   * Step 5: Convert Intel HEX to GB ROM format
   * @private
   */
  async _ihxToRom(ihxContent) {
    this._log('Converting to ROM format...', 'info');

    try {
      // Parse Intel HEX format and convert to binary ROM
      const romData = this._parseIntelHex(ihxContent);

      this._log('ROM generation complete', 'success');
      return romData;
    } catch (error) {
      throw new Error(`ROM conversion failed: ${error.message}`);
    }
  }

  /**
   * Parse Intel HEX format to binary data
   * @private
   */
  _parseIntelHex(ihxContent) {
    const lines = ihxContent.split('\n').filter(line => line.startsWith(':'));

    // Create ROM buffer (32KB for a simple ROM)
    const rom = new Uint8Array(32768);
    rom.fill(0xFF); // Fill with 0xFF (empty ROM pattern)

    for (const line of lines) {
      if (line.length < 11) continue;

      const byteCount = parseInt(line.substring(1, 3), 16);
      const address = parseInt(line.substring(3, 7), 16);
      const recordType = parseInt(line.substring(7, 9), 16);

      if (recordType === 0x00) { // Data record
        for (let i = 0; i < byteCount; i++) {
          const byte = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
          if (address + i < rom.length) {
            rom[address + i] = byte;
          }
        }
      } else if (recordType === 0x01) { // End of file
        break;
      }
    }

    // Add minimal Game Boy header if not present
    this._ensureGameBoyHeader(rom);

    return rom;
  }

  /**
   * Ensure ROM has a valid Game Boy header
   * @private
   */
  _ensureGameBoyHeader(rom) {
    // Nintendo logo is at 0x0104-0x0133
    // If it's empty, add a minimal valid header

    // For now, we'll just ensure the header checksum area exists
    // A real implementation would need proper header generation
    // This is a placeholder for basic functionality

    // Title at 0x0134-0x0143 (16 bytes)
    const title = 'GB2GO';
    for (let i = 0; i < title.length && i < 16; i++) {
      rom[0x0134 + i] = title.charCodeAt(i);
    }
  }

  /**
   * Load a WASM module
   * @private
   */
  async _loadWasmModule(jsPath, name) {
    console.log(`GBDKCompiler: Loading ${name} from ${jsPath}`);

    return new Promise((resolve, reject) => {
      // Get the directory path for the WASM file
      const basePath = jsPath.substring(0, jsPath.lastIndexOf('/') + 1);

      // Buffers to capture all output from module
      const outputBuffer = [];
      const errorBuffer = [];

      // Create a unique Module object for this WASM module
      const moduleConfig = {
        locateFile: function(path) {
          // If it's the .wasm file, return the correct path
          if (path.endsWith('.wasm')) {
            return basePath + path;
          }
          return path;
        },
        print: function(text) {
          outputBuffer.push(text);
          console.log(`[${name}] ${text}`);
        },
        printErr: function(text) {
          errorBuffer.push(text);
          console.warn(`[${name}] ${text}`);
        },
        noInitialRun: true,  // CRITICAL: Don't auto-run main()
        onRuntimeInitialized: null  // Will be set below
      };

      // Set as global Module before loading script
      window.Module = moduleConfig;

      // Remove any existing script tags for this module to force reload
      const existingScripts = document.querySelectorAll(`script[data-module="${name}"]`);
      existingScripts.forEach(s => s.remove());

      const script = document.createElement('script');
      script.src = jsPath + '?t=' + Date.now(); // Cache busting
      script.type = 'text/javascript';
      script.setAttribute('data-module', name);

      script.onload = () => {
        // The script has loaded and Emscripten has replaced window.Module
        const moduleInstance = window.Module;

        // Check if module is already initialized
        if (moduleInstance.calledRun) {
          console.log(`GBDKCompiler: ${name} already initialized`);
          resolve(moduleInstance);
          return;
        }

        // Add timeout in case initialization hangs
        const timeout = setTimeout(() => {
          reject(new Error(`${name} initialization timeout after 30 seconds`));
        }, 30000);

        // Set up runtime initialized callback
        const originalOnInit = moduleInstance.onRuntimeInitialized;
        moduleInstance.onRuntimeInitialized = () => {
          clearTimeout(timeout);

          // Call original if it exists
          if (typeof originalOnInit === 'function') {
            originalOnInit();
          }

          console.log(`GBDKCompiler: ${name} runtime initialized`);
          console.log(`GBDKCompiler: ${name} calledRun status: ${moduleInstance.calledRun}`);

          if (moduleInstance.calledRun) {
            console.warn(`GBDKCompiler: ${name} has already been run! This may cause issues.`);
            // Try to reset the flag
            moduleInstance.calledRun = false;
            console.log(`GBDKCompiler: Reset ${name}.calledRun to false`);
          }

          resolve(moduleInstance);
        };
      };

      script.onerror = () => {
        reject(new Error(`Failed to load ${name} from ${jsPath}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Run a WASM module with arguments
   * @private
   */
  _runModule(module, name, args) {
    console.log(`GBDKCompiler: Running ${name} with args:`, args);
    console.log(`Module ${name} properties:`, Object.keys(module).filter(k => typeof module[k] === 'function'));

    try {
      // Check if callMain exists
      if (!module.callMain) {
        console.error(`${name} available functions:`, Object.keys(module).filter(k => typeof module[k] === 'function'));
        throw new Error(`${name} does not have callMain function`);
      }

      console.log(`Calling ${name}.callMain with:`, args);
      console.log(`Module ${name} calledRun:`, module.calledRun);

      // Check if module has already been run
      if (module.calledRun) {
        console.warn(`${name} has already been run, this might fail`);
      }

      // Capture stdout/stderr
      let output = '';
      let errors = '';

      const originalPrint = module.print || console.log;
      const originalPrintErr = module.printErr || console.error;

      module.print = (text) => {
        output += text + '\n';
        console.log(`[${name} STDOUT]`, text);
        this._log(`[${name}] ${text}`, 'info');
      };

      module.printErr = (text) => {
        errors += text + '\n';
        console.warn(`[${name} STDERR]`, text);
        this._log(`[${name}] ${text}`, 'warning');
      };

      // Reset exit status
      module.exitStatus = undefined;

      // Use callMain() which properly handles argv and runtime setup
      let exitCode;
      try {
        console.log(`Calling ${name}.callMain with args:`, args);

        // callMain accepts an array of strings and handles all the setup
        // Note: callMain doesn't return a value, it sets module.exitStatus
        // callMain automatically sets argv[0] to the program name
        module.callMain(args);

        // Get exit code from module.exitStatus
        exitCode = module.exitStatus !== undefined ? module.exitStatus : 0;
        console.log(`${name} exit status:`, exitCode);

      } catch (e) {
        console.error(`${name}.callMain threw exception:`, e);

        // Emscripten throws ExitStatus on exit()
        if (e && e.name === 'ExitStatus') {
          exitCode = e.status;
          console.log(`${name} called exit(${exitCode})`);
        } else if (module.exitStatus !== undefined) {
          exitCode = module.exitStatus;
        } else {
          console.error('Unexpected exception:', e);
          // Restore functions before rethrowing
          module.print = originalPrint;
          module.printErr = originalPrintErr;
          throw e;
        }
      }

      // Restore original functions
      module.print = originalPrint;
      module.printErr = originalPrintErr;

      console.log(`GBDKCompiler: ${name} exited with code ${exitCode}`);
      console.log(`GBDKCompiler: ${name} output:`, output);
      console.log(`GBDKCompiler: ${name} errors:`, errors);

      if (exitCode !== 0 && exitCode !== undefined) {
        const errorMsg = errors.trim() || output.trim() || 'No error message';
        throw new Error(`${name} exited with code ${exitCode}:\n${errorMsg}`);
      }

      return { output, errors, exitCode };
    } catch (error) {
      console.error(`GBDKCompiler: ${name} execution error:`, error);
      throw new Error(`${name} execution failed: ${error.message}`);
    }
  }

  /**
   * Logging and progress helpers
   * @private
   */
  _log(message, type = 'info') {
    if (this.onLog) {
      this.onLog(message, type);
    }
  }

  _error(message) {
    if (this.onError) {
      this.onError(message);
    }
  }

  _progress(message, percentage) {
    if (this.onProgress) {
      this.onProgress(message, percentage);
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      isCompiling: this.isCompiling,
      modules: {
        sdcpp: this.modules.sdcpp !== null,
        sdcc: this.modules.sdcc !== null,
        assembler: this.modules.assembler !== null,
        linker: this.modules.linker !== null
      },
      vfs: this.vfs.getDebugInfo()
    };
  }
}
