# Deployment

本仓库主要产物是 **桌面应用**（Tauri）。发布通常通过 GitHub Actions（见 `.github/workflows/build.yml`）或本地脚本完成。

## Local Build

前端：

```bash
npm ci
npm run build
```

后端（Rust）：

```bash
cd src-tauri
cargo build --release
```

打包桌面应用（需要系统依赖与 WebView 相关库，详见 Tauri 文档）：

```bash
npm run tauri:build
```

## Release Artifacts

- Rust 构建产物：`src-tauri/target/release/`
- 前端构建产物：`dist/`

可选脚本：

- `./scripts/build.sh [debug|release] [--clean]`
- `./scripts/release.sh`（打包 release 目录）

## Configuration

- 本地配置放在 `.env.local`（已被 `.gitignore` 忽略），例如：

```env
VITE_GATEWAY_URL=ws://127.0.0.1:18789
VITE_GATEWAY_TOKEN=your-token-here
VITE_CANVAS_PORT=18793
```
