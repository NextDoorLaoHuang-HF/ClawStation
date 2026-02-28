# ClawStation

> **OpenClaw 桌面客户端** - 一个基于 Tauri 2.0 构建的现代化 AI 工作站

[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ⚠️ 实验性项目声明

> 本项目目前为实验性项目，尚未经过严谨测试验证其可用性与稳定性，请谨慎使用。

---

## 📖 项目介绍

**ClawStation**（Claw + Station，意为"工作站"）是 OpenClaw 生态系统的桌面客户端，为 AI 工作流提供专业级的工作站体验。

### 核心定位

- 🎯 **多会话并行** - 同时管理多个 AI 会话
- 🎨 **可视化支持** - 集成 Canvas 与 A2UI 渲染
- 📁 **文件管理** - 内置工作区文件浏览器
- 🔌 **插件扩展** - 支持自定义插件系统
- 🖥️ **跨平台** - 支持 Windows 7+ 和 macOS 10.15+

---

## ✨ 功能特性

### 已实现

| 功能 | 描述 | 状态 |
|------|------|------|
| **多会话管理** | 同时管理多个并发会话，支持标签页切换 | ✅ |
| **聊天界面** | 现代化的聊天 UI，支持 Markdown 渲染 | ✅ |
| **Canvas 面板** | WebView 可视化面板，支持 A2UI 渲染 | ✅ |
| **文件浏览器** | 浏览 Agent 工作区文件，支持图片预览 | ✅ |
| **多 Agent 切换** | 在不同 Agent 之间快速切换 | ✅ |
| **系统托盘** | 后台运行，支持托盘图标 | 🚧 |

### 计划中

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **3D 可视化** | 基于 Three.js 的 WebGL 场景渲染 | P1 |
| **自动更新** | 内置更新器，支持签名验证 | P2 |
| **插件市场** | 插件发现与安装 | P3 |

---

## 🛠️ 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev) | 19.x | UI 框架 |
| [TypeScript](https://www.typescriptlang.org) | 5.x | 类型安全 |
| [TailwindCSS](https://tailwindcss.com) | 3.x | 样式系统 |
| [Zustand](https://github.com/pmndrs/zustand) | 5.x | 状态管理 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| [Tauri](https://tauri.app) | 2.0 | 桌面框架 |
| [Rust](https://www.rust-lang.org) | 1.77+ | 原生后端 |
| [Tokio](https://tokio.rs) | 1.x | 异步运行时 |

### 3D 渲染（可选）

| 技术 | 版本 | 用途 |
|------|------|------|
| [Three.js](https://threejs.org) | r160+ | WebGL 渲染 |
| [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) | 8.x | React 集成 |

---

## 📦 安装步骤

### 前提条件

- [Node.js](https://nodejs.org) ^20.19.0 or >=22.13.0（推荐使用 `.nvmrc` 指定的版本）
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- npm（仓库包含 `package-lock.json`，CI 默认使用 npm）

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/openclaw/clawstation.git
cd clawstation

# 2. 安装依赖
npm ci
# （推荐）确认 git hooks 已启用
npm run hooks:install
# 检查本机工具链是否满足最低要求
npm run check:toolchain

# 3. 启动开发（桌面应用）
npm run tauri:dev
```

### 生产构建

```bash
# Windows
npm run tauri:build -- --target x86_64-pc-windows-msvc

# macOS (Intel)
npm run tauri:build -- --target x86_64-apple-darwin

# macOS (Apple Silicon)
npm run tauri:build -- --target aarch64-apple-darwin
```

构建产物位于 `src-tauri/target/release/bundle/`。

---

## 🚀 开发指南

### 开发命令

```bash
# 启动开发服务器（热重载）
npm run dev

# 构建前端
npm run build

# 运行测试
npm test

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

### Tauri 命令

```bash
# 开发模式
npm run tauri:dev

# 生产构建
npm run tauri:build

# 生成图标
npm run tauri:icon
```

### 环境配置

创建 `.env.local` 文件：

```env
# Gateway 配置
VITE_GATEWAY_URL=ws://127.0.0.1:18789
VITE_GATEWAY_TOKEN=your-token-here
VITE_CANVAS_PORT=18793
```

---

## 📁 目录结构

```
clawstation/
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # 入口点
│   │   ├── lib.rs                # 库导出
│   │   ├── gateway/              # Gateway 模块
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs     # WebSocket 连接
│   │   │   └── protocol.rs       # 协议类型
│   │   ├── sessions/             # 会话管理
│   │   │   ├── mod.rs
│   │   │   ├── manager.rs
│   │   │   └── history.rs
│   │   ├── canvas/               # Canvas 模块
│   │   │   ├── mod.rs
│   │   │   ├── panel.rs
│   │   │   └── a2ui.rs
│   │   ├── files/                # 文件模块
│   │   │   ├── mod.rs
│   │   │   ├── browser.rs
│   │   │   └── watcher.rs
│   │   └── agents/               # Agent 模块
│   │       ├── mod.rs
│   │       └── switcher.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # 前端 (React + TypeScript)
│   ├── main.tsx                  # 入口点
│   ├── App.tsx                   # 根组件
│   ├── components/               # React 组件
│   │   ├── layout/               # 布局组件
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── chat/                 # 聊天组件
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   └── InputArea.tsx
│   │   ├── session/              # 会话组件
│   │   │   ├── SessionList.tsx
│   │   │   ├── SessionTabs.tsx
│   │   │   └── SessionHeader.tsx
│   │   ├── canvas/               # Canvas 组件
│   │   │   ├── CanvasPanel.tsx
│   │   │   └── CanvasToolbar.tsx
│   │   ├── files/                # 文件组件
│   │   │   ├── FileBrowser.tsx
│   │   │   ├── FileTree.tsx
│   │   │   └── FilePreview.tsx
│   │   └── scene3d/              # 3D 场景组件
│   │       ├── Scene3D.tsx
│   │       └── SceneControls.tsx
│   ├── stores/                   # Zustand 状态管理
│   │   ├── sessionStore.ts
│   │   ├── agentStore.ts
│   │   └── settingsStore.ts
│   ├── lib/                      # 工具库
│   │   ├── gateway-client.ts     # Gateway API 客户端
│   │   ├── tauri-api.ts          # Tauri 调用封装
│   │   └── utils.ts
│   ├── types/                    # TypeScript 类型
│   │   ├── api.ts
│   │   ├── session.ts
│   │   └── canvas.ts
│   └── styles/                   # 样式文件
│       ├── globals.css
│       └── components.css
│
├── docs/                         # 文档
│   ├── DEVELOPMENT.md            # 开发指南
│   └── PLUGINS.md                # 插件开发指南
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 🔗 相关资源

- [OpenClaw Gateway 协议](https://docs.openclaw.ai/gateway/protocol)
- [OpenClaw Canvas 文档](https://docs.openclaw.ai/platforms/mac/canvas)
- [Tauri 文档](https://tauri.app/v2/guides/)
- [Three.js 文档](https://threejs.org/docs/)

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

[MIT](LICENSE) © OpenClaw Team

---

<p align="center">
  <sub>Built with ❤️ by the OpenClaw Team</sub>
</p>
