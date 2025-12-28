#!/bin/bash

# build-emulator.sh
#
# Clones and builds binjgb (Game Boy emulator) with Emscripten
# for use in the browser-based GB2GO IDE.
#
# Output: ../lib/wasm/binjgb.wasm and ../lib/wasm/binjgb.js

set -e  # Exit on error

echo "=== Building binjgb Emulator ==="
echo ""

# Configuration
BINJGB_REPO="https://github.com/binji/binjgb.git"
BUILD_DIR="$(pwd)/binjgb-build"
OUTPUT_DIR="$(pwd)/../lib/wasm"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Emscripten is installed
if ! command -v emcc &> /dev/null; then
    echo -e "${RED}✗ Emscripten (emcc) not found${NC}"
    echo ""
    echo "Please install Emscripten first:"
    echo "  https://emscripten.org/docs/getting_started/downloads.html"
    echo ""
    echo "Quick install:"
    echo "  git clone https://github.com/emscripten-core/emsdk.git"
    echo "  cd emsdk"
    echo "  ./emsdk install latest"
    echo "  ./emsdk activate latest"
    echo "  source ./emsdk_env.sh"
    exit 1
fi

echo -e "${GREEN}✓ Emscripten found: $(emcc --version | head -1)${NC}"

# Clean up previous build if it exists
if [ -d "$BUILD_DIR" ]; then
    echo ""
    echo "Cleaning up previous build..."
    rm -rf "$BUILD_DIR"
    echo -e "${GREEN}✓ Cleaned up previous build${NC}"
fi

# Clone binjgb repository
echo ""
echo "Cloning binjgb repository..."
git clone --depth 1 "$BINJGB_REPO" "$BUILD_DIR"
echo -e "${GREEN}✓ Repository cloned${NC}"

# Navigate to build directory
cd "$BUILD_DIR"

# Build with Emscripten
echo ""
echo "Building binjgb with Emscripten..."
echo "This may take a few minutes..."
make wasm

# Check if build was successful
if [ ! -f "out/binjgb.wasm" ] || [ ! -f "out/binjgb.js" ]; then
    echo -e "${RED}✗ Build failed - output files not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Copy output files
echo ""
echo "Copying output files to $OUTPUT_DIR..."
cp out/binjgb.wasm "$OUTPUT_DIR/"
cp out/binjgb.js "$OUTPUT_DIR/"

# Get file sizes
WASM_SIZE=$(du -h "$OUTPUT_DIR/binjgb.wasm" | cut -f1)
JS_SIZE=$(du -h "$OUTPUT_DIR/binjgb.js" | cut -f1)

echo -e "${GREEN}✓ Copied binjgb.wasm ($WASM_SIZE)${NC}"
echo -e "${GREEN}✓ Copied binjgb.js ($JS_SIZE)${NC}"

# Clean up build directory
echo ""
echo "Cleaning up build directory..."
cd ..
rm -rf "$BUILD_DIR"
echo -e "${GREEN}✓ Cleanup complete${NC}"

# Summary
echo ""
echo "=== Build Summary ==="
echo "Emulator built and copied to: $OUTPUT_DIR"
echo "Files:"
echo "  - binjgb.wasm ($WASM_SIZE)"
echo "  - binjgb.js ($JS_SIZE)"
echo ""
echo -e "${GREEN}✓ Emulator build complete!${NC}"
