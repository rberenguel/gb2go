/**
 * SpriteEditor - Pixel art editor for Game Boy sprites
 *
 * A constrained pixel editor that outputs PNG files for use with GB2Go.
 * Inspired by MOS editor, tailored for Game Boy's 4-color limitation.
 */

import { SpriteConverter } from '../core/sprite-converter.js';

export class SpriteEditor {
  constructor(options = {}) {
    this.storage = options.storage;
    this.projectId = options.projectId;
    this.onSave = options.onSave || (() => {});
    this.onClose = options.onClose || (() => {});

    // Canvas and context
    this.canvas = null;
    this.ctx = null;

    // Dimensions
    this.spriteWidth = 16;
    this.spriteHeight = 16;
    this.pixelSize = 16; // Display size of each pixel
    this.gridColor = '#444444';

    // Palette (Game Boy DMG default)
    this.palette = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];
    this.palettePresets = {
      'DMG Green': ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'],
      Gray: ['#ffffff', '#aaaaaa', '#555555', '#000000'],
      Pocket: ['#c4cfa1', '#8b956d', '#4d533c', '#1f1f1f'],
      BGB: ['#e0f8d0', '#88c070', '#346856', '#081820'],
    };

    // Pixel data: 2D array [y][x] of palette indices (0-3), null for transparent
    this.pixels = this.createEmptyPixels();

    // Current tool and color
    this.currentTool = 'pencil';
    this.currentColorIndex = 3; // Start with darkest color

    // Drawing state
    this.isDrawing = false;
    this.lastPixel = null;

    // Undo/redo
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;

    // File being edited
    this.currentFilePath = null;

    // Converter
    this.converter = new SpriteConverter();

    // Modal elements (will be set when opened)
    this.modal = null;
    this.backdrop = null;
  }

  /**
   * Create empty pixel grid
   */
  createEmptyPixels() {
    return Array(this.spriteHeight)
      .fill(null)
      .map(() => Array(this.spriteWidth).fill(null));
  }

  /**
   * Clone current pixel data for undo
   */
  clonePixels() {
    return this.pixels.map((row) => [...row]);
  }

  /**
   * Push current state to undo stack
   */
  pushUndo() {
    this.undoStack.push(this.clonePixels());
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  /**
   * Undo last action
   */
  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(this.clonePixels());
    this.pixels = this.undoStack.pop();
    this.render();
  }

  /**
   * Redo last undone action
   */
  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(this.clonePixels());
    this.pixels = this.redoStack.pop();
    this.render();
  }

  /**
   * Open the sprite editor modal
   * @param {object} options - { filePath, width, height }
   */
  async open(options = {}) {
    const { filePath = null, width = 16, height = 16 } = options;

    this.spriteWidth = width;
    this.spriteHeight = height;
    this.currentFilePath = filePath;
    this.pixels = this.createEmptyPixels();
    this.undoStack = [];
    this.redoStack = [];

    // Load existing sprite if file path provided
    if (filePath && this.storage && this.projectId) {
      await this.loadFromFile(filePath);
    }

    this.createModal();
    this.setupEventListeners();
    this.render();
  }

  /**
   * Load sprite from PNG file in storage
   */
  async loadFromFile(filePath) {
    try {
      const result = await this.storage.loadImageAsImageData(this.projectId, filePath);
      if (!result) return;

      const { imageData, width, height } = result;
      this.spriteWidth = width;
      this.spriteHeight = height;

      // Auto-detect palette
      this.palette = this.converter.detectPalette(imageData);

      // Convert image to pixel indices
      this.pixels = this.createEmptyPixels();
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];

          if (a < 128) {
            this.pixels[y][x] = null;
          } else {
            this.pixels[y][x] = this.converter.mapColorToPaletteIndex(r, g, b, a, this.palette);
          }
        }
      }

      console.log(`SpriteEditor: Loaded ${filePath} (${width}x${height})`);
    } catch (error) {
      console.error('Failed to load sprite:', error);
    }
  }

  /**
   * Create the modal DOM structure
   */
  createModal() {
    // Remove existing modal if any
    this.close();

    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'sprite-editor-backdrop';
    this.backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'sprite-editor-modal';
    this.modal.style.cssText = `
      background: #1e1e1e;
      border-radius: 8px;
      padding: 16px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = `
      <h3 style="margin: 0; font-size: 16px;">Sprite Editor</h3>
      <div style="display: flex; gap: 8px;">
        <span style="color: #888; font-size: 12px;">${this.spriteWidth}×${this.spriteHeight}</span>
        <button class="btn-close" style="background: none; border: none; color: #888; cursor: pointer; font-size: 18px;">×</button>
      </div>
    `;

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'sprite-toolbar';
    toolbar.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; align-items: center;';
    toolbar.innerHTML = `
      <div class="tool-group" style="display: flex; gap: 4px;">
        <button class="tool-btn active" data-tool="pencil" title="Pencil (P)">✏️</button>
        <button class="tool-btn" data-tool="eraser" title="Eraser (E)">🧽</button>
        <button class="tool-btn" data-tool="fill" title="Fill (F)">🪣</button>
        <button class="tool-btn" data-tool="line" title="Line (L)">📏</button>
        <button class="tool-btn" data-tool="rect" title="Rectangle (R)">⬜</button>
      </div>
      <div style="width: 1px; height: 24px; background: #444;"></div>
      <div class="tool-group" style="display: flex; gap: 4px;">
        <button class="action-btn" data-action="undo" title="Undo (Ctrl+Z)">↩️</button>
        <button class="action-btn" data-action="redo" title="Redo (Ctrl+Y)">↪️</button>
        <button class="action-btn" data-action="clear" title="Clear">🗑️</button>
      </div>
      <div style="flex: 1;"></div>
      <select class="size-select" style="background: #333; color: #e0e0e0; border: 1px solid #555; padding: 4px 8px; border-radius: 4px;">
        <option value="8">8×8</option>
        <option value="16" selected>16×16</option>
        <option value="32">32×32</option>
      </select>
      <select class="palette-select" style="background: #333; color: #e0e0e0; border: 1px solid #555; padding: 4px 8px; border-radius: 4px;">
        <option value="DMG Green">DMG Green</option>
        <option value="Gray">Gray</option>
        <option value="Pocket">Pocket</option>
        <option value="BGB">BGB</option>
      </select>
    `;

    // Main content area
    const content = document.createElement('div');
    content.style.cssText = 'display: flex; gap: 16px; flex-wrap: wrap;';

    // Canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 4px;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'cursor: crosshair; image-rendering: pixelated;';
    this.updateCanvasSize();
    this.ctx = this.canvas.getContext('2d');
    canvasContainer.appendChild(this.canvas);

    // Side panel (palette + preview)
    const sidePanel = document.createElement('div');
    sidePanel.style.cssText = 'display: flex; flex-direction: column; gap: 12px; min-width: 100px;';

    // Palette
    const paletteDiv = document.createElement('div');
    paletteDiv.className = 'palette-panel';
    paletteDiv.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    paletteDiv.innerHTML = `
      <div style="font-size: 12px; color: #888;">Palette</div>
      <div class="palette-colors" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
        ${this.palette
          .map(
            (color, i) => `
          <button class="palette-color ${i === this.currentColorIndex ? 'active' : ''}"
                  data-index="${i}"
                  style="width: 32px; height: 32px; background: ${color}; border: 2px solid ${i === this.currentColorIndex ? '#fff' : '#444'}; border-radius: 4px; cursor: pointer;">
          </button>
        `
          )
          .join('')}
      </div>
      <button class="transparent-btn" style="background: repeating-conic-gradient(#888 0 90deg, #555 90deg 180deg) 0 0/8px 8px; width: 100%; height: 24px; border: 2px solid #444; border-radius: 4px; cursor: pointer;" title="Transparent (0)"></button>
    `;

    // Preview
    const previewDiv = document.createElement('div');
    previewDiv.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    previewDiv.innerHTML = `
      <div style="font-size: 12px; color: #888;">Preview</div>
      <div class="preview-container" style="display: flex; gap: 8px; align-items: flex-end;">
        <canvas class="preview-1x" width="${this.spriteWidth}" height="${this.spriteHeight}" style="border: 1px solid #444; image-rendering: pixelated;"></canvas>
        <canvas class="preview-2x" width="${this.spriteWidth * 2}" height="${this.spriteHeight * 2}" style="border: 1px solid #444; image-rendering: pixelated;"></canvas>
      </div>
    `;

    sidePanel.appendChild(paletteDiv);
    sidePanel.appendChild(previewDiv);

    content.appendChild(canvasContainer);
    content.appendChild(sidePanel);

    // Footer with save/cancel buttons
    const footer = document.createElement('div');
    footer.style.cssText =
      'display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; border-top: 1px solid #333;';
    footer.innerHTML = `
      <button class="btn-cancel" style="padding: 8px 16px; background: #333; color: #e0e0e0; border: 1px solid #555; border-radius: 4px; cursor: pointer;">Cancel</button>
      <button class="btn-save" style="padding: 8px 16px; background: #4a9eff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Save PNG</button>
    `;

    // Assemble modal
    this.modal.appendChild(header);
    this.modal.appendChild(toolbar);
    this.modal.appendChild(content);
    this.modal.appendChild(footer);
    this.backdrop.appendChild(this.modal);
    document.body.appendChild(this.backdrop);

    // Add styles for tool buttons
    const style = document.createElement('style');
    style.textContent = `
      .sprite-editor-modal .tool-btn,
      .sprite-editor-modal .action-btn {
        width: 32px;
        height: 32px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .sprite-editor-modal .tool-btn:hover,
      .sprite-editor-modal .action-btn:hover {
        background: #444;
      }
      .sprite-editor-modal .tool-btn.active {
        background: #4a9eff;
        border-color: #4a9eff;
      }
      .sprite-editor-modal .palette-color.active {
        border-color: #fff !important;
      }
    `;
    this.modal.appendChild(style);
  }

  /**
   * Update canvas size based on sprite dimensions
   */
  updateCanvasSize() {
    const maxCanvasSize = 400;
    this.pixelSize = Math.min(
      Math.floor(maxCanvasSize / this.spriteWidth),
      Math.floor(maxCanvasSize / this.spriteHeight),
      32
    );
    this.pixelSize = Math.max(this.pixelSize, 8);

    this.canvas.width = this.spriteWidth * this.pixelSize;
    this.canvas.height = this.spriteHeight * this.pixelSize;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Canvas drawing events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMouseDown(this.touchToMouse(touch));
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleMouseMove(this.touchToMouse(touch));
    });
    this.canvas.addEventListener('touchend', () => this.handleMouseUp());

    // Tool buttons
    this.modal.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.modal.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;
      });
    });

    // Action buttons
    this.modal.querySelectorAll('.action-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'undo') this.undo();
        else if (action === 'redo') this.redo();
        else if (action === 'clear') {
          this.pushUndo();
          this.pixels = this.createEmptyPixels();
          this.render();
        }
      });
    });

    // Palette colors
    this.modal.querySelectorAll('.palette-color').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentColorIndex = parseInt(btn.dataset.index);
        this.updatePaletteUI();
      });
    });

    // Transparent button
    this.modal.querySelector('.transparent-btn').addEventListener('click', () => {
      this.currentColorIndex = null; // null means transparent/erase
      this.updatePaletteUI();
    });

    // Size select
    this.modal.querySelector('.size-select').addEventListener('change', (e) => {
      const newSize = parseInt(e.target.value);
      if (newSize !== this.spriteWidth || newSize !== this.spriteHeight) {
        this.resizeSprite(newSize, newSize);
      }
    });

    // Palette preset select
    this.modal.querySelector('.palette-select').addEventListener('change', (e) => {
      const preset = this.palettePresets[e.target.value];
      if (preset) {
        this.palette = [...preset];
        this.updatePaletteUI();
        this.render();
      }
    });

    // Close button
    this.modal.querySelector('.btn-close').addEventListener('click', () => this.close());

    // Cancel button
    this.modal.querySelector('.btn-cancel').addEventListener('click', () => this.close());

    // Save button
    this.modal.querySelector('.btn-save').addEventListener('click', () => this.save());

    // Backdrop click to close
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    // Keyboard shortcuts
    this.keyHandler = (e) => {
      if (!this.modal) return;

      if (e.key === 'Escape') {
        this.close();
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        this.undo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'p') {
        this.setTool('pencil');
      } else if (e.key === 'e') {
        this.setTool('eraser');
      } else if (e.key === 'f') {
        this.setTool('fill');
      } else if (e.key === 'l') {
        this.setTool('line');
      } else if (e.key === 'r') {
        this.setTool('rect');
      } else if (e.key >= '1' && e.key <= '4') {
        this.currentColorIndex = parseInt(e.key) - 1;
        this.updatePaletteUI();
      } else if (e.key === '0') {
        this.currentColorIndex = null;
        this.updatePaletteUI();
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Convert touch event to mouse-like event
   */
  touchToMouse(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    };
  }

  /**
   * Set the current tool
   */
  setTool(tool) {
    this.currentTool = tool;
    this.modal.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
  }

  /**
   * Update palette UI to reflect current selection
   */
  updatePaletteUI() {
    const paletteContainer = this.modal.querySelector('.palette-colors');
    paletteContainer.innerHTML = this.palette
      .map(
        (color, i) => `
      <button class="palette-color ${i === this.currentColorIndex ? 'active' : ''}"
              data-index="${i}"
              style="width: 32px; height: 32px; background: ${color}; border: 2px solid ${i === this.currentColorIndex ? '#fff' : '#444'}; border-radius: 4px; cursor: pointer;">
      </button>
    `
      )
      .join('');

    // Re-attach event listeners
    paletteContainer.querySelectorAll('.palette-color').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentColorIndex = parseInt(btn.dataset.index);
        this.updatePaletteUI();
      });
    });

    // Update transparent button
    const transBtn = this.modal.querySelector('.transparent-btn');
    transBtn.style.borderColor = this.currentColorIndex === null ? '#fff' : '#444';
  }

  /**
   * Resize sprite canvas
   */
  resizeSprite(newWidth, newHeight) {
    this.pushUndo();

    const oldPixels = this.pixels;
    this.spriteWidth = newWidth;
    this.spriteHeight = newHeight;
    this.pixels = this.createEmptyPixels();

    // Copy old pixels
    for (let y = 0; y < Math.min(oldPixels.length, newHeight); y++) {
      for (let x = 0; x < Math.min(oldPixels[y].length, newWidth); x++) {
        this.pixels[y][x] = oldPixels[y][x];
      }
    }

    this.updateCanvasSize();
    this.render();

    // Update size display
    this.modal.querySelector('.btn-close').previousElementSibling.textContent =
      `${newWidth}×${newHeight}`;

    // Update preview canvases
    const preview1x = this.modal.querySelector('.preview-1x');
    const preview2x = this.modal.querySelector('.preview-2x');
    preview1x.width = newWidth;
    preview1x.height = newHeight;
    preview2x.width = newWidth * 2;
    preview2x.height = newHeight * 2;
  }

  /**
   * Get pixel coordinates from mouse event
   */
  getPixelCoords(e) {
    const x = Math.floor(e.offsetX / this.pixelSize);
    const y = Math.floor(e.offsetY / this.pixelSize);
    return {
      x: Math.max(0, Math.min(x, this.spriteWidth - 1)),
      y: Math.max(0, Math.min(y, this.spriteHeight - 1)),
    };
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(e) {
    this.isDrawing = true;
    const { x, y } = this.getPixelCoords(e);
    this.lastPixel = { x, y };

    if (this.currentTool === 'pencil' || this.currentTool === 'eraser') {
      this.pushUndo();
      this.drawPixel(x, y);
    } else if (this.currentTool === 'fill') {
      this.pushUndo();
      this.floodFill(x, y);
    }

    this.render();
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    if (!this.isDrawing) return;

    const { x, y } = this.getPixelCoords(e);

    if ((this.currentTool === 'pencil' || this.currentTool === 'eraser') && this.lastPixel) {
      // Draw line from last pixel to current for smooth strokes
      this.drawLine(this.lastPixel.x, this.lastPixel.y, x, y);
      this.lastPixel = { x, y };
    }

    this.render();
  }

  /**
   * Handle mouse up
   */
  handleMouseUp() {
    if (this.currentTool === 'line' && this.lastPixel && this.isDrawing) {
      const { x, y } = this.lastPixel;
      // Line tool would need start/end points - simplified for now
    }

    this.isDrawing = false;
    this.lastPixel = null;
  }

  /**
   * Draw a single pixel
   */
  drawPixel(x, y) {
    if (x < 0 || x >= this.spriteWidth || y < 0 || y >= this.spriteHeight) return;

    if (this.currentTool === 'eraser') {
      this.pixels[y][x] = null;
    } else {
      this.pixels[y][x] = this.currentColorIndex;
    }
  }

  /**
   * Draw a line between two points (Bresenham's algorithm)
   */
  drawLine(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.drawPixel(x0, y0);

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /**
   * Flood fill from a point
   */
  floodFill(startX, startY) {
    const targetColor = this.pixels[startY][startX];
    const fillColor = this.currentColorIndex;

    if (targetColor === fillColor) return;

    const stack = [{ x: startX, y: startY }];
    const visited = new Set();

    while (stack.length > 0) {
      const { x, y } = stack.pop();
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= this.spriteWidth || y < 0 || y >= this.spriteHeight) continue;
      if (this.pixels[y][x] !== targetColor) continue;

      visited.add(key);
      this.pixels[y][x] = fillColor;

      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }
  }

  /**
   * Render the canvas
   */
  render() {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const ps = this.pixelSize;

    // Clear canvas
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw pixels
    for (let y = 0; y < this.spriteHeight; y++) {
      for (let x = 0; x < this.spriteWidth; x++) {
        const colorIndex = this.pixels[y][x];

        if (colorIndex === null) {
          // Draw checkerboard for transparent
          ctx.fillStyle = '#555';
          ctx.fillRect(x * ps, y * ps, ps / 2, ps / 2);
          ctx.fillRect(x * ps + ps / 2, y * ps + ps / 2, ps / 2, ps / 2);
          ctx.fillStyle = '#444';
          ctx.fillRect(x * ps + ps / 2, y * ps, ps / 2, ps / 2);
          ctx.fillRect(x * ps, y * ps + ps / 2, ps / 2, ps / 2);
        } else {
          ctx.fillStyle = this.palette[colorIndex] || '#000';
          ctx.fillRect(x * ps, y * ps, ps, ps);
        }
      }
    }

    // Draw grid
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.spriteWidth; x++) {
      ctx.moveTo(x * ps + 0.5, 0);
      ctx.lineTo(x * ps + 0.5, this.canvas.height);
    }
    for (let y = 0; y <= this.spriteHeight; y++) {
      ctx.moveTo(0, y * ps + 0.5);
      ctx.lineTo(this.canvas.width, y * ps + 0.5);
    }
    ctx.stroke();

    // Update previews
    this.renderPreviews();
  }

  /**
   * Render preview canvases
   */
  renderPreviews() {
    const preview1x = this.modal?.querySelector('.preview-1x');
    const preview2x = this.modal?.querySelector('.preview-2x');
    if (!preview1x || !preview2x) return;

    // 1x preview - fill with palette color 0 ("screen off" background)
    const ctx1 = preview1x.getContext('2d');
    ctx1.fillStyle = this.palette[0] || '#9bbc0f';
    ctx1.fillRect(0, 0, preview1x.width, preview1x.height);

    // Draw sprite pixels on top
    for (let y = 0; y < this.spriteHeight; y++) {
      for (let x = 0; x < this.spriteWidth; x++) {
        const colorIndex = this.pixels[y][x];
        // Draw all pixels including null (transparent = color 0)
        if (colorIndex !== null && colorIndex !== 0) {
          ctx1.fillStyle = this.palette[colorIndex];
          ctx1.fillRect(x, y, 1, 1);
        }
        // null/0 pixels show the background (already filled)
      }
    }

    // 2x preview
    const ctx2 = preview2x.getContext('2d');
    ctx2.imageSmoothingEnabled = false;
    ctx2.drawImage(preview1x, 0, 0, preview2x.width, preview2x.height);
  }

  /**
   * Save sprite as PNG to project
   */
  async save() {
    try {
      // Generate PNG blob
      const blob = await this.converter.pixelsToPNG(
        this.pixels,
        this.spriteWidth,
        this.spriteHeight,
        this.palette
      );

      // Determine file path
      let filePath = this.currentFilePath;
      if (!filePath) {
        // Generate a default filename
        const timestamp = Date.now();
        filePath = `sprites/sprite_${timestamp}.png`;
      }

      // Save to storage
      if (this.storage && this.projectId) {
        await this.storage.saveBinaryFile(this.projectId, filePath, blob);
        console.log(`SpriteEditor: Saved ${filePath}`);
      }

      // Call onSave callback
      this.onSave(filePath, blob);

      this.close();
    } catch (error) {
      console.error('Failed to save sprite:', error);
      alert('Failed to save sprite: ' + error.message);
    }
  }

  /**
   * Close the editor
   */
  close() {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    if (this.backdrop) {
      this.backdrop.remove();
      this.backdrop = null;
      this.modal = null;
    }

    this.onClose();
  }

  /**
   * Static method to create and open editor
   */
  static async open(options) {
    const editor = new SpriteEditor(options);
    await editor.open(options);
    return editor;
  }
}
