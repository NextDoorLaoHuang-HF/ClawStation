#!/usr/bin/env bash
# Fail fast when local toolchains are too old for this repository.

set -euo pipefail

REQUIRED_RUST_VERSION="1.77.0"

version_ge() {
  local actual="$1"
  local required="$2"
  [[ "$(printf '%s\n' "$required" "$actual" | sort -V | head -n1)" == "$required" ]]
}

if ! command -v rustc >/dev/null 2>&1; then
  echo "❌ rustc not found. Install Rust ${REQUIRED_RUST_VERSION}+ first."
  exit 1
fi

rust_version="$(rustc --version | awk '{print $2}')"
if ! version_ge "$rust_version" "$REQUIRED_RUST_VERSION"; then
  echo "❌ Rust toolchain too old: found ${rust_version}, need ${REQUIRED_RUST_VERSION}+."
  echo "   ClawStation checks are not reliable on this toolchain."
  exit 1
fi

