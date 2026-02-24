# Architecture

ClawStation 是一个 **Tauri 2 + Rust 后端** 与 **React + TypeScript 前端** 的桌面应用。

## High-Level Flow

1. 前端（`src/`）负责 UI 与状态管理（Zustand）。
2. 前端通过 Tauri `invoke()` 调用后端命令（`src-tauri/src/**` 的 `#[tauri::command]`）。
3. 后端与 Gateway（WebSocket）通信、管理会话/文件/Canvas，并把结果返回给前端渲染。

## Frontend Modules

- `src/components/`: UI 组件（layout/chat/session/canvas/files/settings）
- `src/stores/`: Zustand stores（尽量作为 UI 与后端 API 的边界层）
- `src/lib/`: 前端服务/封装（如 API client、工具函数）
- `src/types/`: 跨模块共享类型
- `src/plugins/`: 前端插件系统实现

## Backend Modules (Rust)

- `src-tauri/src/gateway.rs`: Gateway 连接与事件
- `src-tauri/src/sessions.rs`: 会话与消息历史
- `src-tauri/src/files.rs`: 工作区文件浏览/读取/监听
- `src-tauri/src/canvas.rs`: Canvas/WebView 协作与 A2UI
- `src-tauri/src/plugins/`: 插件管理（含沙箱与测试）

## Architecture Guardrails

- `node scripts/layer-lint.js`: 检查跨层依赖（防止低层依赖高层）。
- `node scripts/doc-check.js`: 检查文档中引用的脚本/文件/`npm run` 命令是否真实存在。

