/**
 * VirtualFS - Virtual Filesystem Manager
 *
 * Manages in-memory filesystems for Emscripten WASM modules.
 * Each WASM module (sdcc, sdcpp, as-gbz80, link-gbz80) has its own FS instance.
 *
 * This class provides a unified interface to:
 * - Initialize filesystems for each module
 * - Preload GBDK headers and libraries
 * - Read/write files across different module filesystems
 * - Create directories and manage file operations
 */

export class VirtualFS {
  constructor() {
    // Map of module name -> Emscripten Module object
    this.modules = new Map();

    // Cached GBDK resources
    this.headers = null;
    this.libraries = null;

    // Track which modules have been initialized
    this.initializedModules = new Set();

    console.log('VirtualFS: Created');
  }

  /**
   * Initialize filesystem for a WASM module
   * @param {Object} Module - Emscripten Module object with FS API
   * @param {string} name - Module name (e.g., 'sdcc', 'as-gbz80')
   */
  initModule(Module, name) {
    if (!Module || !Module.FS) {
      throw new Error(`VirtualFS: Module ${name} does not have FS API`);
    }

    console.log(`VirtualFS: Initializing module "${name}"`);

    this.modules.set(name, Module);
    this.initializedModules.add(name);

    // Create standard directory structure
    this._createStandardDirs(Module, name);

    console.log(`VirtualFS: Module "${name}" initialized`);
  }

  /**
   * Create standard directory structure for a module
   * @private
   */
  _createStandardDirs(Module, name) {
    const dirs = ['/include', '/lib', '/tmp', '/src', '/build'];

    for (const dir of dirs) {
      try {
        Module.FS.mkdir(dir);
      } catch (e) {
        // Directory might already exist, ignore error
        if (e.code !== 'EEXIST') {
          console.warn(`VirtualFS: Failed to create ${dir} in ${name}:`, e.message);
        }
      }
    }
  }

  /**
   * Load GBDK resources (headers and libraries) from JSON files
   * @returns {Promise<void>}
   */
  async preloadResources() {
    console.log('VirtualFS: Preloading GBDK resources...');

    try {
      // Load headers JSON
      const headersResponse = await fetch('./lib/resources/headers.json');
      if (!headersResponse.ok) {
        throw new Error(`Failed to load headers.json: ${headersResponse.status}`);
      }
      this.headers = await headersResponse.json();
      console.log(`VirtualFS: Loaded ${Object.keys(this.headers).length} header files`);

      // Load libraries JSON
      const librariesResponse = await fetch('./lib/resources/libraries.json');
      if (!librariesResponse.ok) {
        throw new Error(`Failed to load libraries.json: ${librariesResponse.status}`);
      }
      this.libraries = await librariesResponse.json();
      console.log(`VirtualFS: Loaded ${Object.keys(this.libraries).length} library files`);

      // Preload resources into all initialized modules
      for (const [moduleName, module] of this.modules.entries()) {
        this._preloadResourcesIntoModule(module, moduleName);
      }

      console.log('VirtualFS: Resources preloaded successfully');
    } catch (error) {
      console.error('VirtualFS: Failed to preload resources:', error);
      throw error;
    }
  }

  /**
   * Preload resources into a specific module's filesystem
   * @private
   */
  _preloadResourcesIntoModule(Module, moduleName) {
    console.log(`VirtualFS: Preloading resources into "${moduleName}"`);

    // Write header files
    if (this.headers) {
      for (const [path, content] of Object.entries(this.headers)) {
        const fullPath = `/include/${path}`;
        this._ensureDirectoryExists(Module, fullPath);

        try {
          Module.FS.writeFile(fullPath, content);
        } catch (e) {
          console.warn(`VirtualFS: Failed to write header ${fullPath}:`, e.message);
        }
      }
    }

    // Write library files (base64 encoded binary data)
    if (this.libraries) {
      for (const [path, base64Content] of Object.entries(this.libraries)) {
        const fullPath = `/lib/${path}`;
        this._ensureDirectoryExists(Module, fullPath);

        try {
          // Decode base64 to binary
          const binaryContent = this._base64ToUint8Array(base64Content);
          Module.FS.writeFile(fullPath, binaryContent);
        } catch (e) {
          console.warn(`VirtualFS: Failed to write library ${fullPath}:`, e.message);
        }
      }
    }
  }

  /**
   * Write a file to a module's filesystem
   * @param {string} moduleName - Name of the module
   * @param {string} path - File path (e.g., '/src/main.c')
   * @param {string|Uint8Array} content - File content (text or binary)
   */
  writeFile(moduleName, path, content) {
    const Module = this._getModule(moduleName);

    // Ensure parent directory exists
    this._ensureDirectoryExists(Module, path);

    try {
      Module.FS.writeFile(path, content);
      console.log(`VirtualFS: Wrote file ${path} to ${moduleName}`);
    } catch (e) {
      console.error(`VirtualFS: Failed to write ${path} to ${moduleName}:`, e);
      throw e;
    }
  }

  /**
   * Read a file from a module's filesystem
   * @param {string} moduleName - Name of the module
   * @param {string} path - File path
   * @param {boolean} binary - If true, return Uint8Array; if false, return string
   * @returns {string|Uint8Array}
   */
  readFile(moduleName, path, binary = false) {
    const Module = this._getModule(moduleName);

    try {
      const data = Module.FS.readFile(path);

      if (binary) {
        return data; // Already Uint8Array
      } else {
        // Convert to string
        return new TextDecoder('utf-8').decode(data);
      }
    } catch (e) {
      console.error(`VirtualFS: Failed to read ${path} from ${moduleName}:`, e);
      throw e;
    }
  }

  /**
   * Create a directory path recursively (like mkdir -p)
   * @param {string} moduleName - Name of the module
   * @param {string} path - Directory path to create
   */
  mkdirp(moduleName, path) {
    const Module = this._getModule(moduleName);

    const parts = path.split('/').filter((p) => p.length > 0);
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;

      try {
        Module.FS.mkdir(currentPath);
      } catch (e) {
        // Ignore if directory already exists
        if (e.code !== 'EEXIST') {
          console.warn(`VirtualFS: Failed to create directory ${currentPath}:`, e.message);
        }
      }
    }
  }

  /**
   * List files in a directory
   * @param {string} moduleName - Name of the module
   * @param {string} path - Directory path
   * @returns {string[]} Array of file/directory names
   */
  listFiles(moduleName, path = '/') {
    const Module = this._getModule(moduleName);

    try {
      return Module.FS.readdir(path).filter((name) => name !== '.' && name !== '..');
    } catch (e) {
      console.error(`VirtualFS: Failed to list ${path} in ${moduleName}:`, e);
      return [];
    }
  }

  /**
   * Delete a file
   * @param {string} moduleName - Name of the module
   * @param {string} path - File path
   */
  deleteFile(moduleName, path) {
    const Module = this._getModule(moduleName);

    try {
      Module.FS.unlink(path);
      console.log(`VirtualFS: Deleted ${path} from ${moduleName}`);
    } catch (e) {
      console.error(`VirtualFS: Failed to delete ${path} from ${moduleName}:`, e);
      throw e;
    }
  }

  /**
   * Check if a file exists
   * @param {string} moduleName - Name of the module
   * @param {string} path - File path
   * @returns {boolean}
   */
  fileExists(moduleName, path) {
    const Module = this._getModule(moduleName);

    try {
      Module.FS.stat(path);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get file stats
   * @param {string} moduleName - Name of the module
   * @param {string} path - File path
   * @returns {Object} File stats object
   */
  stat(moduleName, path) {
    const Module = this._getModule(moduleName);

    try {
      return Module.FS.stat(path);
    } catch (e) {
      console.error(`VirtualFS: Failed to stat ${path} in ${moduleName}:`, e);
      throw e;
    }
  }

  /**
   * Copy a file from one module to another
   * @param {string} sourceModule - Source module name
   * @param {string} sourcePath - Source file path
   * @param {string} destModule - Destination module name
   * @param {string} destPath - Destination file path
   */
  copyFile(sourceModule, sourcePath, destModule, destPath) {
    const content = this.readFile(sourceModule, sourcePath, true);
    this.writeFile(destModule, destPath, content);
    console.log(
      `VirtualFS: Copied ${sourcePath} from ${sourceModule} to ${destPath} in ${destModule}`
    );
  }

  /**
   * Get a module by name (with error checking)
   * @private
   */
  _getModule(moduleName) {
    const Module = this.modules.get(moduleName);

    if (!Module) {
      throw new Error(
        `VirtualFS: Module "${moduleName}" not initialized. Available modules: ${Array.from(this.modules.keys()).join(', ')}`
      );
    }

    return Module;
  }

  /**
   * Ensure parent directory exists for a file path
   * @private
   */
  _ensureDirectoryExists(Module, filePath) {
    const parts = filePath.split('/').filter((p) => p.length > 0);

    // Remove filename (last part)
    parts.pop();

    if (parts.length === 0) return;

    let currentPath = '';
    for (const part of parts) {
      currentPath += '/' + part;

      try {
        Module.FS.mkdir(currentPath);
      } catch (e) {
        // Ignore if directory already exists
        if (e.code !== 'EEXIST') {
          // Only log real errors
        }
      }
    }
  }

  /**
   * Convert base64 string to Uint8Array
   * @private
   */
  _base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  /**
   * Get debug info about the VFS state
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      initializedModules: Array.from(this.initializedModules),
      headersLoaded: this.headers !== null,
      librariesLoaded: this.libraries !== null,
      headerCount: this.headers ? Object.keys(this.headers).length : 0,
      libraryCount: this.libraries ? Object.keys(this.libraries).length : 0,
    };
  }
}
