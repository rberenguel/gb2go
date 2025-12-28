/**
 * GameBoyEmulator - Game Boy Emulator Wrapper
 *
 * Wraps the binjgb WebAssembly emulator for use in GB2GO.
 * Handles ROM loading, frame rendering, audio, and input.
 */

export class GameBoyEmulator {
  constructor() {
    // Emulator state
    this.module = null;
    this.emulator = null;
    this.joypad = null;
    this.romData = null;
    this.romPtr = null;

    // Canvas and rendering
    this.canvas = null;
    this.ctx = null;
    this.imageData = null;

    // Timing
    this.isRunning = false;
    this.rafId = null;
    this.lastFrameTime = 0;
    this.targetFps = 60;
    this.frameDuration = 1000 / this.targetFps;

    // Frame buffer constants
    this.SCREEN_WIDTH = 160;
    this.SCREEN_HEIGHT = 144;
    this.FRAME_BUFFER_SIZE = this.SCREEN_WIDTH * this.SCREEN_HEIGHT * 4; // RGBA

    // Callbacks
    this.onFrame = null;
    this.onError = null;

    // Palette definitions
    this.PALETTES = {
      // Classic "pea soup" green
      dmg: [
        [15, 56, 15], // Darkest (Black) -> #0f380f
        [48, 98, 48], // Dark (Dark Gray) -> #306230
        [139, 172, 15], // Light (Light Gray) -> #8bac0f
        [155, 188, 15], // Lightest (White) -> #9bbc0f
      ],
      // Neutral grayscale
      gray: [
        [0, 0, 0], // Darkest
        [85, 85, 85], // Dark
        [170, 170, 170], // Light
        [255, 255, 255], // Lightest
      ],
      // Game Boy Pocket (softer gray)
      pocket: [
        [40, 40, 40], // Darkest
        [90, 90, 90], // Dark
        [160, 160, 160], // Light
        [220, 220, 220], // Lightest
      ],
    };

    this.currentPaletteName = 'dmg';
    this.palette = this.PALETTES[this.currentPaletteName];
  }

  /**
   * Set the color palette
   * @param {string} name - Palette name ('dmg', 'gray', 'pocket')
   */
  setPalette(name) {
    if (this.PALETTES[name]) {
      this.currentPaletteName = name;
      this.palette = this.PALETTES[name];
      console.log(`GameBoyEmulator: Palette set to ${name}`);
      // Force re-render if not running
      if (!this.isRunning && this.emulator) {
        this._renderFrame();
      }
    } else {
      console.warn(`GameBoyEmulator: Unknown palette "${name}"`);
    }
  }

  /**
   * Initialize the emulator
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @returns {Promise<void>}
   */
  async initialize(canvas) {
    console.log('GameBoyEmulator: Initializing...');

    try {
      // Store canvas reference
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      // Create ImageData for rendering
      this.imageData = this.ctx.createImageData(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);

      // Load binjgb WASM module
      const Binjgb = await this._loadBinjgbModule();
      this.module = Binjgb;

      console.log('GameBoyEmulator: Module loaded');
      console.log(
        'GameBoyEmulator: Available functions:',
        Object.keys(this.module).filter((k) => k.startsWith('_'))
      );

      console.log('GameBoyEmulator: Initialized successfully');
    } catch (error) {
      console.error('GameBoyEmulator: Initialization failed:', error);
      if (this.onError) {
        this.onError(`Emulator initialization failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load the binjgb WASM module
   * @private
   */
  async _loadBinjgbModule() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = './lib/wasm/binjgb.js';
      script.type = 'text/javascript';

      script.onload = async () => {
        try {
          // Wait for the Binjgb module to be ready
          const module = await window.Binjgb();
          console.log('Binjgb module ready');
          resolve(module);
        } catch (error) {
          reject(error);
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load binjgb.js'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Load a ROM into the emulator
   * @param {Uint8Array} romData - The ROM data to load
   * @returns {Promise<void>}
   */
  async loadROM(romData) {
    if (!this.module) {
      throw new Error('Emulator not initialized. Call initialize() first.');
    }

    console.log('GameBoyEmulator: Loading ROM...', romData.length, 'bytes');

    try {
      // Clean up previous emulator instance if it exists
      if (this.emulator && this.module._emulator_delete) {
        this.module._emulator_delete(this.emulator);
        this.emulator = null;
      }

      if (this.joypad && this.module._joypad_delete) {
        this.module._joypad_delete(this.joypad);
        this.joypad = null;
      }

      if (this.romPtr && this.module._free) {
        this.module._free(this.romPtr);
        this.romPtr = null;
      }

      // Store ROM data
      this.romData = romData;

      // Allocate memory for ROM in WASM
      const romSize = romData.length;
      this.romPtr = this.module._malloc(romSize);

      if (!this.romPtr) {
        throw new Error('Failed to allocate memory for ROM');
      }

      // Copy ROM data to WASM memory
      this.module.HEAPU8.set(romData, this.romPtr);

      console.log('GameBoyEmulator: ROM copied to WASM memory at', this.romPtr);

      // Create joypad
      this.joypad = this.module._joypad_new();
      console.log('GameBoyEmulator: Joypad created:', this.joypad);

      // Create emulator instance with ROM
      this.emulator = this.module._emulator_new_simple(
        this.romPtr,
        romSize,
        44100, // audio_frequency (must be non-zero to avoid div by zero)
        4096 // audio_frames (buffer size)
      );

      if (!this.emulator) {
        throw new Error('Failed to create emulator instance');
      }

      console.log('GameBoyEmulator: Emulator created:', this.emulator);

      // Set up joypad callback
      this.module._emulator_set_default_joypad_callback(this.emulator, this.joypad);

      console.log('GameBoyEmulator: ROM loaded successfully');

      // Render the first frame
      this._renderFrame();
    } catch (error) {
      console.error('GameBoyEmulator: ROM loading failed:', error);
      if (this.onError) {
        this.onError(`ROM loading failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Start running the emulator
   */
  start() {
    if (!this.emulator) {
      throw new Error('No ROM loaded. Call loadROM() first.');
    }

    if (this.isRunning) {
      console.log('GameBoyEmulator: Already running');
      return;
    }

    console.log('GameBoyEmulator: Starting...');
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this._runFrame();
  }

  /**
   * Pause the emulator
   */
  pause() {
    if (!this.isRunning) {
      console.log('GameBoyEmulator: Already paused');
      return;
    }

    console.log('GameBoyEmulator: Pausing...');
    this.isRunning = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Reset the emulator
   */
  reset() {
    console.log('GameBoyEmulator: Resetting...');

    // Pause if running
    this.pause();

    // Reload the ROM
    if (this.romData) {
      this.loadROM(this.romData);
    }
  }

  /**
   * Run a single frame
   * @private
   */
  _runFrame() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    // Run at target FPS (60 fps)
    if (deltaTime >= this.frameDuration) {
      this.lastFrameTime = currentTime - (deltaTime % this.frameDuration);

      try {
        // Run emulator for one frame (~16.67ms = ~70224 CPU cycles)
        // Game Boy runs at ~4.194304 MHz = 4194304 cycles/second
        // One frame at 60 fps = 4194304 / 60 = 69905 cycles
        const CYCLES_PER_FRAME = 70224;

        const currentTicks = this.module._emulator_get_ticks_f64(this.emulator);
        const targetTicks = currentTicks + CYCLES_PER_FRAME;

        this.module._emulator_run_until_f64(this.emulator, targetTicks);

        // Render the frame
        this._renderFrame();

        // Call frame callback if provided
        if (this.onFrame) {
          this.onFrame();
        }
      } catch (error) {
        console.error('GameBoyEmulator: Frame execution error:', error);
        this.pause();
        if (this.onError) {
          this.onError(`Frame execution error: ${error.message}`);
        }
        return;
      }
    }

    // Schedule next frame
    this.rafId = requestAnimationFrame(() => this._runFrame());
  }

  /**
   * Render the current frame to canvas
   * @private
   */
  _renderFrame() {
    if (!this.emulator || !this.ctx || !this.imageData) return;

    try {
      // Get frame buffer pointer from WASM
      const frameBufferPtr = this.module._get_frame_buffer_ptr(this.emulator);
      const frameBufferSize = this.module._get_frame_buffer_size(this.emulator);

      if (!frameBufferPtr || frameBufferSize !== this.FRAME_BUFFER_SIZE) {
        console.warn('GameBoyEmulator: Invalid frame buffer');
        return;
      }

      // Access frame buffer directly from WASM memory
      // Note: We use the raw memory to avoid copying it twice if possible,
      // but to apply the palette we must iterate anyway.
      const wasmBuffer = new Uint8Array(this.module.HEAPU8.buffer, frameBufferPtr, frameBufferSize);

      const targetData = this.imageData.data;
      const palette = this.palette;

      // Apply palette mapping
      // binjgb outputs RGBA, but it's grayscale (R=G=B)
      // We read the red channel (index i) to determine brightness
      for (let i = 0; i < frameBufferSize; i += 4) {
        // Get brightness from Red channel (0-255)
        const brightness = wasmBuffer[i];

        // Map brightness to palette index (0-3)
        // 0 (Black) -> 0
        // 85 (Dark Gray) -> 1
        // 170 (Light Gray) -> 2
        // 255 (White) -> 3
        // We use ranges to be safe against slight variations
        let colorIndex = 0;
        if (brightness > 212) colorIndex = 3;
        else if (brightness > 127) colorIndex = 2;
        else if (brightness > 42) colorIndex = 1;
        else colorIndex = 0;

        const [r, g, b] = palette[colorIndex];

        targetData[i] = r; // R
        targetData[i + 1] = g; // G
        targetData[i + 2] = b; // B
        targetData[i + 3] = 255; // Alpha (Always solid)
      }

      // Render to canvas
      this.ctx.putImageData(this.imageData, 0, 0);
    } catch (error) {
      console.error('GameBoyEmulator: Render error:', error);
    }
  }

  /**
   * Set button state
   * @param {string} button - Button name: 'up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'
   * @param {boolean} pressed - Whether the button is pressed
   */
  setButton(button, pressed) {
    if (!this.joypad) {
      console.warn('GameBoyEmulator: Joypad not initialized');
      return;
    }

    // Map button names to binjgb functions
    const buttonFunctions = {
      up: '_set_joyp_up',
      down: '_set_joyp_down',
      left: '_set_joyp_left',
      right: '_set_joyp_right',
      a: '_set_joyp_A',
      b: '_set_joyp_B',
      start: '_set_joyp_start',
      select: '_set_joyp_select',
    };

    const functionName = buttonFunctions[button];
    if (!functionName || !this.module[functionName]) {
      console.warn(`GameBoyEmulator: Unknown button: ${button}`);
      return;
    }

    // Call the appropriate function
    // Parameters: joypad, pressed (1 = pressed, 0 = released)
    this.module[functionName](this.joypad, pressed ? 1 : 0);

    console.log(`GameBoyEmulator: Button ${button} ${pressed ? 'pressed' : 'released'}`);
  }

  /**
   * Clean up resources
   */
  destroy() {
    console.log('GameBoyEmulator: Destroying...');

    this.pause();

    if (this.emulator && this.module && this.module._emulator_delete) {
      this.module._emulator_delete(this.emulator);
      this.emulator = null;
    }

    if (this.joypad && this.module && this.module._joypad_delete) {
      this.module._joypad_delete(this.joypad);
      this.joypad = null;
    }

    if (this.romPtr && this.module && this.module._free) {
      this.module._free(this.romPtr);
      this.romPtr = null;
    }

    this.module = null;
    this.romData = null;

    console.log('GameBoyEmulator: Destroyed');
  }

  /**
   * Get emulator status
   */
  getStatus() {
    return {
      isInitialized: this.module !== null,
      isRomLoaded: this.emulator !== null,
      isRunning: this.isRunning,
      romSize: this.romData ? this.romData.length : 0,
    };
  }
}
