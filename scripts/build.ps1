# Build script for ClawStation (Windows)
# Usage: .\scripts\build.ps1 [-BuildType <debug|release>] [-Clean]

param(
    [ValidateSet("debug", "release")]
    [string]$BuildType = "release",
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Colors for output (PowerShell doesn't have built-in colors like bash)
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    $colors = @{
        "Red"     = [ConsoleColor]::Red
        "Green"   = [ConsoleColor]::Green
        "Yellow"  = [ConsoleColor]::Yellow
        "White"   = [ConsoleColor]::White
    }
    
    $previousColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $colors[$Color]
    Write-Host $Message
    $Host.UI.RawUI.ForegroundColor = $previousColor
}

Write-ColorOutput "Building ClawStation..." -Color "Green"
Write-Host "Build type: $BuildType"

# Check for required tools
function Test-Tool {
    param([string]$ToolName)
    
    $tool = Get-Command $ToolName -ErrorAction SilentlyContinue
    if (-not $tool) {
        Write-ColorOutput "Error: $ToolName is not installed." -Color "Red"
        exit 1
    }
}

Write-ColorOutput "Checking prerequisites..." -Color "Yellow"
Test-Tool "cargo"
Test-Tool "rustc"

# Show Rust version
Write-Host "Rust version: $(rustc --version)"
Write-Host "Cargo version: $(cargo --version)"

# Clean previous builds if requested
if ($Clean) {
    Write-ColorOutput "Cleaning previous builds..." -Color "Yellow"
    cargo clean --manifest-path="$ProjectRoot\src-tauri\Cargo.toml"
    if (Test-Path "$ProjectRoot\src-tauri\target") {
        Remove-Item -Recurse -Force "$ProjectRoot\src-tauri\target"
    }
}

# Build the project
Write-ColorOutput "Building project..." -Color "Yellow"

if ($BuildType -eq "debug") {
    Write-Host "Building debug version..."
    cargo build --manifest-path="$ProjectRoot\src-tauri\Cargo.toml"
}
elseif ($BuildType -eq "release") {
    Write-Host "Building release version (optimized)..."
    cargo build --release --manifest-path="$ProjectRoot\src-tauri\Cargo.toml"
}

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput "Build successful!" -Color "Green"
    
    # Show output location
    if ($BuildType -eq "release") {
        $outputDir = "$ProjectRoot\src-tauri\target\release"
        Write-Host "Output: $outputDir"
        if (Test-Path $outputDir) {
            Get-ChildItem $outputDir | Select-Object -First 20
        }
    }
    else {
        $outputDir = "$ProjectRoot\src-tauri\target\debug"
        Write-Host "Output: $outputDir"
        if (Test-Path $outputDir) {
            Get-ChildItem $outputDir | Select-Object -First 20
        }
    }
}
else {
    Write-ColorOutput "Build failed!" -Color "Red"
    exit 1
}

# Build frontend if needed
if (Test-Path "$ProjectRoot\package.json") {
    Write-ColorOutput "Building frontend..." -Color "Yellow"
    Set-Location $ProjectRoot
    
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        npm run build
    }
    elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm build
    }
    elseif (Get-Command yarn -ErrorAction SilentlyContinue) {
        yarn build
    }
    else {
        Write-ColorOutput "Warning: No Node.js package manager found, skipping frontend build." -Color "Yellow"
    }
}

Write-ColorOutput "Done!" -Color "Green"
