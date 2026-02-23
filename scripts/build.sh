#!/bin/bash
# Build script for ClawStation (Linux/macOS)
# Usage: ./scripts/build.sh [debug|release]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to release build
BUILD_TYPE="${1:-release}"

echo -e "${GREEN}Building ClawStation...${NC}"
echo "Build type: $BUILD_TYPE"

# Check for required tools
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed.${NC}"
        exit 1
    fi
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     echo "linux";;
        Darwin*)    echo "macos";;
        *)          echo "unknown";;
    esac
}

OS="$(detect_os)"
echo "Detected OS: $OS"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
check_tool "cargo"
check_tool "rustc"

# Show Rust version
echo "Rust version: $(rustc --version)"
echo "Cargo version: $(cargo --version)"

# Clean previous builds (optional)
if [ "$2" = "--clean" ]; then
    echo -e "${YELLOW}Cleaning previous builds...${NC}"
    cargo clean --manifest-path="$PROJECT_ROOT/src-tauri/Cargo.toml"
    rm -rf "$PROJECT_ROOT/src-tauri/target"
fi

# Build the project
echo -e "${YELLOW}Building project...${NC}"

if [ "$BUILD_TYPE" = "debug" ]; then
    echo "Building debug version..."
    cargo build --manifest-path="$PROJECT_ROOT/src-tauri/Cargo.toml"
elif [ "$BUILD_TYPE" = "release" ]; then
    echo "Building release version (optimized)..."
    cargo build --release --manifest-path="$PROJECT_ROOT/src-tauri/Cargo.toml"
else
    echo -e "${RED}Unknown build type: $BUILD_TYPE${NC}"
    echo "Usage: $0 [debug|release] [--clean]"
    exit 1
fi

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Build successful!${NC}"
    
    # Show output location
    if [ "$BUILD_TYPE" = "release" ]; then
        echo "Output: $PROJECT_ROOT/src-tauri/target/release/"
        ls -la "$PROJECT_ROOT/src-tauri/target/release/" | head -20
    else
        echo "Output: $PROJECT_ROOT/src-tauri/target/debug/"
        ls -la "$PROJECT_ROOT/src-tauri/target/debug/" | head -20
    fi
else
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Build frontend if needed
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${YELLOW}Building frontend...${NC}"
    cd "$PROJECT_ROOT"
    
    if command -v npm &> /dev/null; then
        npm run build
    elif command -v pnpm &> /dev/null; then
        pnpm build
    elif command -v yarn &> /dev/null; then
        yarn build
    else
        echo -e "${YELLOW}Warning: No Node.js package manager found, skipping frontend build.${NC}"
    fi
fi

echo -e "${GREEN}Done!${NC}"
