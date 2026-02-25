# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.8] - 2026-02-25

### Added
- Settings modal (Gateway + Plugins)
- Release gates: `npm run release-gate` + `npm run tauri-command-lint`
- Tauri API client mappings + invoke contract tests

### Changed
- Sessions now send via Tauri backend in-app and stream agent output via events
- Backend `send_message` now forwards chat requests to the Gateway
- Header/Sidebar now use real Gateway connection state + open settings modal

---

## [1.0.7] - 2026-02-24

### Fixed
- GitHub Actions: macOS artifact packaging step now correctly zips the produced `ClawStation.app`

---

## [1.0.6] - 2026-02-24

### Fixed
- macOS bundling: add missing `src-tauri/icons/128x128@2x.png` so `tauri build` can produce `ClawStation.app`

---

## [1.0.5] - 2026-02-24

### Fixed
- GitHub Actions: surface macOS Tauri build failure details in the job summary
- ESLint: ignore generated `src-tauri/target/` artifacts to avoid false parse errors

### Changed
- GitHub Actions: build only the `.app` bundle for macOS in CI (`--bundles app`)
- GitHub Actions: disable fail-fast for macOS matrix to get both arch results

---

## [1.0.4] - 2026-02-24

### Fixed
- macOS release artifacts now include a double-clickable `ClawStation.app` bundle (`*.app.zip`)
- Removed invalid `plugins.fs.scope` config that caused Tauri startup crashes

### Changed
- Use `tauri_build::build()` in `src-tauri/build.rs`
- Ignore generated `src-tauri/gen/` files

---

## [1.0.3] - 2026-02-24

### Added
- CI/build troubleshooting section in `docs/DEVELOPMENT.md`
- Local quality gates: pre-commit + pre-push checks (scripts + git hooks)

### Changed
- Pinned Node version via `.nvmrc` and aligned CI to use it
- CI now upgrades npm to a stable version to avoid intermittent `npm ci` crashes
- Normalized `package-lock.json` `resolved` URLs to `https://registry.npmjs.org/` for CI reliability

---

## [1.0.2] - 2026-02-24

### Changed
- Disabled crates.io publish step in CI (desktop app doesn't need crate publishing)
- Updated package.json version to match Tauri version

---

## [1.0.1] - 2026-02-24

### Added
- macOS arm64 (Apple Silicon) build support in CI

### Fixed
- FileBrowser now connects to backend API correctly
- File preview functionality working

---

## [1.1.0] - Planned 2026-03-01

### Added
- Gateway authentication implementation
- A2UI protocol complete implementation
- Plugin sandbox isolation
- Integration test framework
- Error handling standardization
- Accessibility optimizations

### Changed
- Improved test coverage to ≥80%
- Enhanced documentation completeness to ≥90%
- All modules quality upgraded to B+ or above

---

## [1.0.0] - 2026-02-23

### Added

#### Frontend
- Multi-session management with tab support
- Chat interface with Markdown rendering
- Canvas panel for WebView visualization
- File browser for Agent workspace
- Multi-Agent switcher
- Plugin system with sandbox security
- Zustand state management

#### Backend
- Gateway WebSocket connection
- Session management (create, list, switch, close)
- Canvas rendering coordination
- File system operations (browse, read, watch)
- Agent management and switching
- Plugin system (30+ tests)
- System tray support (partial)

#### Documentation
- README.md - Project introduction
- docs/DEVELOPMENT.md - Development guide
- docs/PLUGINS.md - Plugin development guide
- docs/QUALITY.md - Quality tracking
- docs/ARCHITECTURE.md - Architecture design
- docs/ROADMAP.md - Development roadmap
- docs/QUALITY-IMPROVEMENT.md - Quality improvement plan
- CONTRIBUTING.md - Contribution guide

#### CI/CD
- GitHub Actions workflow
- Automated lint, test, build
- Cross-platform builds (Windows, macOS)

### Technical Stack
- Frontend: React 18 + TypeScript + TailwindCSS + Zustand
- Backend: Tauri 2.0 + Rust + Tokio
- 3D Ready: Three.js + React Three Fiber (planned)

### Quality Metrics
- Test coverage: ~40% → target 80%
- Documentation: ~60% → target 90%
- All clippy warnings resolved
- TypeScript strict mode enabled

---

## [0.1.0] - 2026-02-23

### Added
- Initial project structure
- Tauri 2.0 setup
- React 18 setup
- Basic Gateway connection prototype
- Technical specification documents

---

## Release Notes

### v1.0.0 Highlights

**ClawStation** 是 OpenClaw 生态系统的桌面客户端，为 AI 工作流提供专业级的工作站体验。

核心功能：
- 🎯 多会话并行 - 同时管理多个 AI 会话
- 🎨 可视化支持 - 集成 Canvas 与 A2UI 渲染
- 📁 文件管理 - 内置工作区文件浏览器
- 🔌 插件扩展 - 支持自定义插件系统
- 🖥️ 跨平台 - 支持 Windows 7+ 和 macOS 10.15+

技术亮点：
- 最小打包体积（2-5MB）
- 原生性能（Rust 后端）
- 现代化 UI（React 18）
- 分层架构设计

---

## Future Plans

See [ROADMAP.md](docs/ROADMAP.md) for detailed development roadmap.

- v1.1.0 - Stability enhancement
- v1.2.0 - UX improvements
- v2.0.0 - 3D visualization
- v3.0.0 - Enterprise features

---

*This project is actively developed. Updates will be posted regularly.*
