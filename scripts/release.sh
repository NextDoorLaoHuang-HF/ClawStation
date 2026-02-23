#!/bin/bash
# Release script for ClawStation
# Builds release artifacts and optionally creates GitHub releases
# Usage: ./scripts/release.sh [--skip-build] [--skip-frontend] [--github-release]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
SKIP_BUILD=false
SKIP_FRONTEND=false
GITHUB_RELEASE=false
TAG_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --github-release)
            GITHUB_RELEASE=true
            shift
            ;;
        --tag)
            TAG_NAME="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--skip-build] [--skip-frontend] [--github-release] [--tag <tag>]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           ClawStation Release Script                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Get version from Cargo.toml
VERSION=$(grep -m1 '^version = ' "$PROJECT_ROOT/src-tauri/Cargo.toml" | sed 's/version = "\(.*\)"/\1/')
echo -e "${GREEN}Building release version: $VERSION${NC}"

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"
echo "Target: $OS ($ARCH)"

# Create release directory
RELEASE_DIR="$PROJECT_ROOT/release"
mkdir -p "$RELEASE_DIR"

# Build frontend
if [ "$SKIP_FRONTEND" = false ]; then
    echo -e "${YELLOW}Building frontend...${NC}"
    cd "$PROJECT_ROOT"
    
    if command -v npm &> /dev/null; then
        npm run build
    elif command -v pnpm &> /dev/null; then
        pnpm build
    elif command -v yarn &> /dev/null; then
        yarn build
    else
        echo -e "${YELLOW}Warning: No Node.js package manager found.${NC}"
    fi
else
    echo -e "${YELLOW}Skipping frontend build.${NC}"
fi

# Build Rust backend
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}Building Rust backend (release)...${NC}"
    cd "$PROJECT_ROOT"
    cargo build --release --manifest-path="$PROJECT_ROOT/src-tauri/Cargo.toml"
else
    echo -e "${YELLOW}Skipping Rust build.${NC}"
fi

# Package the application
echo -e "${YELLOW}Packaging release artifacts...${NC}"

case "$OS" in
    Linux)
        PACKAGE_NAME="clawstation-${VERSION}-linux-x64"
        PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
        mkdir -p "$PACKAGE_DIR"
        
        # Copy binaries
        if [ -f "$PROJECT_ROOT/src-tauri/target/release/clawstation" ]; then
            cp "$PROJECT_ROOT/src-tauri/target/release/clawstation" "$PACKAGE_DIR/"
        fi
        if [ -f "$PROJECT_ROOT/src-tauri/target/release/libclawstation_lib.so" ]; then
            cp "$PROJECT_ROOT/src-tauri/target/release/libclawstation_lib.so" "$PACKAGE_DIR/"
        fi
        
        # Copy frontend
        if [ -d "$PROJECT_ROOT/dist" ]; then
            cp -r "$PROJECT_ROOT/dist" "$PACKAGE_DIR/"
        fi
        
        # Create tarball
        cd "$RELEASE_DIR"
        tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
        echo -e "${GREEN}Created: ${PACKAGE_NAME}.tar.gz${NC}"
        ;;
        
    Darwin)
        PACKAGE_NAME="clawstation-${VERSION}-macos-x64"
        PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
        mkdir -p "$PACKAGE_DIR"
        
        # Copy binaries
        if [ -f "$PROJECT_ROOT/src-tauri/target/release/clawstation" ]; then
            cp "$PROJECT_ROOT/src-tauri/target/release/clawstation" "$PACKAGE_DIR/"
        fi
        if [ -f "$PROJECT_ROOT/src-tauri/target/release/libclawstation_lib.dylib" ]; then
            cp "$PROJECT_ROOT/src-tauri/target/release/libclawstation_lib.dylib" "$PACKAGE_DIR/"
        fi
        
        # Copy frontend
        if [ -d "$PROJECT_ROOT/dist" ]; then
            cp -r "$PROJECT_ROOT/dist" "$PACKAGE_DIR/"
        fi
        
        # Create tarball
        cd "$RELEASE_DIR"
        tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"
        echo -e "${GREEN}Created: ${PACKAGE_NAME}.tar.gz${NC}"
        ;;
        
    MINGW*|MSYS*|CYGWIN*)
        PACKAGE_NAME="clawstation-${VERSION}-windows-x64"
        PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
        mkdir -p "$PACKAGE_DIR"
        
        # Copy binaries
        if [ -f "$PROJECT_ROOT/src-tauri/target/release/clawstation.exe" ]; then
            cp "$PROJECT_ROOT/src-tauri/target/release/clawstation.exe" "$PACKAGE_DIR/"
        fi
        if [ -f "$PROJECT_ROOT/src-tauri/target/release/clawstation_lib.dll" ]; then
            cp "$PROJECT_ROOT/src-tauri/target/release/clawstation_lib.dll" "$PACKAGE_DIR/"
        fi
        
        # Copy frontend
        if [ -d "$PROJECT_ROOT/dist" ]; then
            cp -r "$PROJECT_ROOT/dist" "$PACKAGE_DIR/"
        fi
        
        # Create zip
        cd "$RELEASE_DIR"
        powershell -Command "Compress-Archive -Path '$PACKAGE_NAME' -DestinationPath '${PACKAGE_NAME}.zip' -Force"
        echo -e "${GREEN}Created: ${PACKAGE_NAME}.zip${NC}"
        ;;
        
    *)
        echo -e "${RED}Unsupported OS: $OS${NC}"
        exit 1
        ;;
esac

# GitHub Release
if [ "$GITHUB_RELEASE" = true ]; then
    echo -e "${YELLOW}Creating GitHub release...${NC}"
    
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
        exit 1
    fi
    
    # Check if tag exists, create if not
    if [ -n "$TAG_NAME" ]; then
        if ! git rev-parse "$TAG_NAME" &> /dev/null; then
            echo "Creating git tag: $TAG_NAME"
            git tag -a "$TAG_NAME" -m "Release $VERSION"
            git push origin "$TAG_NAME"
        fi
    fi
    
    # Create release
    gh release create "${TAG_NAME:-v${VERSION}}" \
        --title "ClawStation ${VERSION}" \
        --notes "Release ${VERSION} of ClawStation" \
        "$RELEASE_DIR"/*
    
    echo -e "${GREEN}GitHub release created!${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Release Complete!                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Artifacts location: $RELEASE_DIR"
ls -la "$RELEASE_DIR"
