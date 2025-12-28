# Third-Party Licenses

**GB2GO** uses several open-source libraries and tools. Their licenses and source code locations are listed below.

## Core Compilation Tools (WASM)

These components are distributed as WebAssembly binaries to enable in-browser compilation.

### SDCC (Small Device C Compiler)
*   **Role:** C Compiler & Linker logic (`sdcc.js`, `sdcc.wasm`, `sdcpp.js`, `sdcpp.wasm`, `link-gbz80.js`, `link-gbz80.wasm`)
*   **License:** GNU General Public License v2 (GPLv2) / GPLv2+LE
*   **Source Code:** [http://sdcc.sourceforge.net/](http://sdcc.sourceforge.net/)
*   **Note:** The use of SDCC binaries requires offering access to its source code, which is available at the link above.

### GBDK-2020 (GameBoy Developer's Kit)
*   **Role:** Game Boy development libraries and headers.
*   **License:**
    *   **Tools:** GPLv2+LE (Linking Exception)
    *   **Libraries:** LGPL / GPLv2+LE
*   **Source Code:** [https://github.com/gbdk-2020/gbdk-2020](https://github.com/gbdk-2020/gbdk-2020)

## Emulation

### Binjgb
*   **Role:** Game Boy Emulator (WASM) (`binjgb.js`, `binjgb.wasm`)
*   **License:** MIT License
*   **Source Code:** [https://github.com/binji/binjgb](https://github.com/binji/binjgb)
*   **Copyright:** (c) 2016-2019 Ben Smith

## Editor & UI

### CodeMirror 6
*   **Role:** Code Editor Component
*   **License:** MIT License
*   **Source Code:** [https://codemirror.net/](https://codemirror.net/)
*   **Copyright:** (C) 2018-2021 by Marijn Haverbeke

## Fonts & Icons

### Monoid
*   **Role:** Editor Font
*   **License:** MIT License / OFL (Open Font License)
*   **Source:** [https://larsenwork.com/monoid/](https://larsenwork.com/monoid/)
*   **Author:** Andreas Larsen

### Iconoir
*   **Role:** UI Icons
*   **License:** MIT License
*   **Source:** [https://iconoir.com/](https://iconoir.com/)
