# GB2GO - Browser-based Game Boy IDE

**GB2GO** is a zero-setup, in-browser Integrated Development Environment (IDE) for creating Game Boy games using C and GBDK.

It provides a complete toolchain in your browser:

- **Editor**: Syntax highlighting and autocomplete (CodeMirror 6).
- **Compiler**: In-browser GBDK-2020/SDCC compilation via WebAssembly.
- **Emulator**: Instant preview using the Binjgb emulator backend.
- **Asset Management**: Drag-and-drop support for resources.

## Quick Start

1.  Open `index.html` in a modern web browser (or serve it via a local web server).
2.  Write your C code in the editor.
3.  Click **"Compile"** to build your ROM.
4.  Click **"Run"** to test it instantly in the built-in emulator.

## License

This project ("GB2GO"), including the UI and glue code located in `src/` and `index.html`, is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for details.

### Third-Party Components

GB2GO relies on several powerful open-source tools distributed as WebAssembly:

- **SDCC / GBDK-2020** (GPLv2+LE)
- **Binjgb** (MIT)

For a full list of third-party licenses and links to their source code, please see the details in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
