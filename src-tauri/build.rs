// Build script for ClawStation
// This file is required by Tauri to generate context at compile time

fn main() {
    // Tell Cargo that if the given file changes, to rerun this build script
    // This is handled automatically by Tauri
    println!("cargo:rerun-if-changed=src/");
    println!("cargo:rerun-if-changed=tauri.conf.json");
}
