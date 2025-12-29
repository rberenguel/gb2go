/**
 * StorageManager - Project and File Persistence
 *
 * Manages user projects and files using IndexedDB for persistent storage.
 * Provides ZIP import/export for backup and sharing.
 *
 * Database Schema:
 * - projects: { id, name, createdAt, updatedAt, metadata }
 * - files: { id, projectId, path, content, type, size, updatedAt }
 */

export class StorageManager {
  constructor() {
    this.dbName = 'gb2go-db';
    this.dbVersion = 1;
    this.db = null;
    this.currentProjectId = null;

    // JSZip will be loaded dynamically
    this.JSZip = null;

    console.log('StorageManager: Created');
  }

  /**
   * Initialize IndexedDB and load JSZip
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('StorageManager: Initializing...');

    // Initialize IndexedDB
    await this._initIndexedDB();

    // Load JSZip from CDN
    await this._loadJSZip();

    // Load current project ID from localStorage
    this.currentProjectId = localStorage.getItem('gb2go-current-project');

    // Request persistent storage (important for Safari iOS)
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`StorageManager: Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
    }

    console.log('StorageManager: Initialized');
  }

  /**
   * Initialize IndexedDB
   * @private
   * @returns {Promise<void>}
   */
  _initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB: Opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create projects object store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', {
            keyPath: 'id',
            autoIncrement: false,
          });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          console.log('IndexedDB: Created "projects" object store');
        }

        // Create files object store
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', {
            keyPath: 'id',
            autoIncrement: true,
          });
          fileStore.createIndex('projectId', 'projectId', { unique: false });
          fileStore.createIndex('path', ['projectId', 'path'], { unique: true });
          console.log('IndexedDB: Created "files" object store');
        }
      };
    });
  }

  /**
   * Load JSZip library dynamically
   * @private
   * @returns {Promise<void>}
   */
  async _loadJSZip() {
    if (window.JSZip) {
      this.JSZip = window.JSZip;
      console.log('StorageManager: JSZip already loaded');
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';

      script.onload = () => {
        this.JSZip = window.JSZip;
        console.log('StorageManager: JSZip loaded from CDN');
        resolve();
      };

      script.onerror = () => {
        console.warn('StorageManager: Failed to load JSZip from CDN');
        reject(new Error('Failed to load JSZip'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Generate a unique project ID
   * @private
   * @returns {string}
   */
  _generateProjectId() {
    return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new project
   * @param {string} name - Project name
   * @param {Object} template - Project template with files
   * @returns {Promise<Object>} Created project
   */
  async createProject(name, template = null) {
    const projectId = this._generateProjectId();
    const now = new Date().toISOString();

    const project = {
      id: projectId,
      name: name,
      createdAt: now,
      updatedAt: now,
      metadata: {
        description: '',
        version: '1.0.0',
        author: '',
      },
    };

    // Store project in IndexedDB
    const tx = this.db.transaction(['projects'], 'readwrite');
    const store = tx.objectStore('projects');

    await new Promise((resolve, reject) => {
      const request = store.add(project);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to create project: ${request.error}`));
    });

    console.log(`StorageManager: Created project "${name}" (${projectId})`);

    // Add template files if provided
    if (template && template.files) {
      for (const [path, content] of Object.entries(template.files)) {
        await this.saveFile(projectId, path, content);
      }
    }

    return project;
  }

  /**
   * Load a project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} Project with files
   */
  async loadProject(projectId) {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Load project metadata
    const tx = this.db.transaction(['projects', 'files'], 'readonly');
    const projectStore = tx.objectStore('projects');
    const fileStore = tx.objectStore('files');

    const project = await new Promise((resolve, reject) => {
      const request = projectStore.get(projectId);
      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error(`Project not found: ${projectId}`));
        } else {
          resolve(request.result);
        }
      };
      request.onerror = () => reject(new Error(`Failed to load project: ${request.error}`));
    });

    // Load all files for this project
    const fileIndex = fileStore.index('projectId');
    const files = await new Promise((resolve, reject) => {
      const request = fileIndex.getAll(projectId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to load files: ${request.error}`));
    });

    // Convert files array to { path: content } object
    project.files = {};
    for (const file of files) {
      project.files[file.path] = file.content;
    }

    this.currentProjectId = projectId;
    localStorage.setItem('gb2go-current-project', projectId);

    console.log(`StorageManager: Loaded project "${project.name}" with ${files.length} files`);
    return project;
  }

  /**
   * Save/update project metadata
   * @param {Object} project - Project object
   * @returns {Promise<void>}
   */
  async saveProject(project) {
    if (!project.id) {
      throw new Error('Project ID is required');
    }

    project.updatedAt = new Date().toISOString();

    const tx = this.db.transaction(['projects'], 'readwrite');
    const store = tx.objectStore('projects');

    await new Promise((resolve, reject) => {
      const request = store.put(project);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save project: ${request.error}`));
    });

    console.log(`StorageManager: Saved project "${project.name}"`);
  }

  /**
   * Save a file to a project
   * @param {string} projectId - Project ID
   * @param {string} path - File path (e.g., 'src/main.c')
   * @param {string|Uint8Array} content - File content
   * @param {string} type - File type ('text' or 'binary')
   * @returns {Promise<void>}
   */
  async saveFile(projectId, path, content, type = 'text') {
    if (!projectId || !path) {
      throw new Error('Project ID and path are required');
    }

    const file = {
      projectId: projectId,
      path: path,
      content: content,
      type: type,
      size: typeof content === 'string' ? content.length : content.byteLength,
      updatedAt: new Date().toISOString(),
    };

    const tx = this.db.transaction(['files', 'projects'], 'readwrite');
    const fileStore = tx.objectStore('files');
    const projectStore = tx.objectStore('projects');

    // Check if file already exists
    const pathIndex = fileStore.index('path');
    const existingFile = await new Promise((resolve, reject) => {
      const request = pathIndex.get([projectId, path]);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to check file: ${request.error}`));
    });

    // Update or add file
    await new Promise((resolve, reject) => {
      let request;
      if (existingFile) {
        file.id = existingFile.id;
        request = fileStore.put(file);
      } else {
        request = fileStore.add(file);
      }
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save file: ${request.error}`));
    });

    // Update project's updatedAt timestamp
    const project = await new Promise((resolve, reject) => {
      const request = projectStore.get(projectId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to load project: ${request.error}`));
    });

    if (project) {
      project.updatedAt = new Date().toISOString();
      await new Promise((resolve, reject) => {
        const request = projectStore.put(project);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to update project: ${request.error}`));
      });
    }

    console.log(`StorageManager: Saved file "${path}" to project ${projectId}`);
  }

  /**
   * Delete a file from a project
   * @param {string} projectId - Project ID
   * @param {string} path - File path
   * @returns {Promise<void>}
   */
  async deleteFile(projectId, path) {
    const tx = this.db.transaction(['files'], 'readwrite');
    const fileStore = tx.objectStore('files');
    const pathIndex = fileStore.index('path');

    const file = await new Promise((resolve, reject) => {
      const request = pathIndex.get([projectId, path]);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to find file: ${request.error}`));
    });

    if (!file) {
      throw new Error(`File not found: ${path}`);
    }

    await new Promise((resolve, reject) => {
      const request = fileStore.delete(file.id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete file: ${request.error}`));
    });

    console.log(`StorageManager: Deleted file "${path}" from project ${projectId}`);
  }

  /**
   * List all files in a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of file objects
   */
  async listFiles(projectId) {
    const tx = this.db.transaction(['files'], 'readonly');
    const fileStore = tx.objectStore('files');
    const index = fileStore.index('projectId');

    const files = await new Promise((resolve, reject) => {
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to list files: ${request.error}`));
    });

    return files;
  }

  /**
   * List all projects
   * @returns {Promise<Array>} Array of project objects (without files)
   */
  async listProjects() {
    const tx = this.db.transaction(['projects'], 'readonly');
    const store = tx.objectStore('projects');

    const projects = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to list projects: ${request.error}`));
    });

    // Sort by most recently updated
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return projects;
  }

  /**
   * Delete a project and all its files
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   */
  async deleteProject(projectId) {
    const tx = this.db.transaction(['projects', 'files'], 'readwrite');
    const projectStore = tx.objectStore('projects');
    const fileStore = tx.objectStore('files');
    const fileIndex = fileStore.index('projectId');

    // Delete all files in the project
    const files = await new Promise((resolve, reject) => {
      const request = fileIndex.getAll(projectId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to list files: ${request.error}`));
    });

    for (const file of files) {
      await new Promise((resolve, reject) => {
        const request = fileStore.delete(file.id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete file: ${request.error}`));
      });
    }

    // Delete the project
    await new Promise((resolve, reject) => {
      const request = projectStore.delete(projectId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete project: ${request.error}`));
    });

    // Clear current project if it was deleted
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
      localStorage.removeItem('gb2go-current-project');
    }

    console.log(`StorageManager: Deleted project ${projectId} and ${files.length} files`);
  }

  /**
   * Export a project as a ZIP file
   * @param {string} projectId - Project ID
   * @returns {Promise<Blob>} ZIP file as Blob
   */
  async exportProjectAsZip(projectId) {
    if (!this.JSZip) {
      throw new Error('JSZip not loaded');
    }

    const project = await this.loadProject(projectId);
    const zip = new this.JSZip();

    // Add project metadata
    zip.file(
      'project.json',
      JSON.stringify(
        {
          name: project.name,
          metadata: project.metadata,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
        null,
        2
      )
    );

    // Add all files
    for (const [path, content] of Object.entries(project.files)) {
      zip.file(path, content);
    }

    // Generate ZIP blob
    const blob = await zip.generateAsync({ type: 'blob' });

    console.log(`StorageManager: Exported project "${project.name}" as ZIP`);
    return blob;
  }

  /**
   * Import a project from a ZIP file
   * @param {File|Blob} zipFile - ZIP file
   * @param {string} projectName - Optional custom project name
   * @returns {Promise<Object>} Imported project
   */
  async importProjectFromZip(zipFile, projectName = null) {
    if (!this.JSZip) {
      throw new Error('JSZip not loaded');
    }

    const zip = await this.JSZip.loadAsync(zipFile);

    // Try to load project metadata
    let metadata = null;
    let name = projectName;

    if (zip.files['project.json']) {
      const metadataText = await zip.files['project.json'].async('text');
      metadata = JSON.parse(metadataText);
      if (!name) {
        name = metadata.name || 'Imported Project';
      }
    } else {
      if (!name) {
        name = 'Imported Project';
      }
    }

    // Create new project
    const project = await this.createProject(name);

    if (metadata && metadata.metadata) {
      project.metadata = metadata.metadata;
      await this.saveProject(project);
    }

    // Import all files (except project.json)
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir || path === 'project.json') continue;

      // Determine if file is binary based on extension
      const ext = path.split('.').pop().toLowerCase();
      const binaryExtensions = ['bin', 'gb', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'lib', 'o', 'obj'];
      const isBinary = binaryExtensions.includes(ext);

      let content;
      if (isBinary) {
        content = await zipEntry.async('uint8array');
      } else {
        content = await zipEntry.async('text');
      }

      await this.saveFile(project.id, path, content, isBinary ? 'binary' : 'text');
    }

    console.log(`StorageManager: Imported project "${name}" from ZIP`);
    return await this.loadProject(project.id);
  }

  /**
   * Download a blob as a file
   * @param {Blob} blob - Blob to download
   * @param {string} filename - Filename
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Get current project ID
   * @returns {string|null}
   */
  getCurrentProjectId() {
    return this.currentProjectId;
  }

  /**
   * Set current project ID
   * @param {string} projectId - Project ID
   */
  setCurrentProjectId(projectId) {
    this.currentProjectId = projectId;
    if (projectId) {
      localStorage.setItem('gb2go-current-project', projectId);
    } else {
      localStorage.removeItem('gb2go-current-project');
    }
  }
}
