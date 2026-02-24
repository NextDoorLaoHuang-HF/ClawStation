# ClawStation 开发指南

> 本文档面向 ClawStation 开发者，介绍项目架构、开发流程和调试技巧。

---

## 📋 目录

1. [开发环境设置](#开发环境设置)
2. [项目架构说明](#项目架构说明)
3. [前端架构](#前端架构)
4. [后端架构](#后端架构)
5. [API 接口说明](#api-接口说明)
6. [调试技巧](#调试技巧)

---

## 开发环境设置

### 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 20.19.0 | 22.12.0+ (LTS) |
| Rust | 1.77.0 | 1.80+ |
| npm | 9.x | 10.x |

### 安装步骤

#### 1. 安装 Node.js

```bash
# 使用 nvm (推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22.12.0
nvm use 22.12.0

# 或使用官方安装包
# https://nodejs.org/
```

#### 2. 安装 Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

#### 3. （可选）安装 pnpm

```bash
npm install -g pnpm
```

#### 4. 安装系统依赖

**macOS:**
```bash
# Xcode Command Line Tools
xcode-select --install
```

**Windows:**
```powershell
# 安装 Visual Studio Build Tools
# 或 Visual Studio 2022 (含 C++ 工作负载)
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### 项目初始化

```bash
# 克隆仓库
git clone https://github.com/openclaw/clawstation.git
cd clawstation

# 安装依赖（仓库包含 package-lock.json，CI 默认使用 npm）
npm ci

# 启动开发（桌面应用）
npm run tauri:dev
```

### IDE 配置

#### VS Code 推荐插件

```json
{
  "recommendations": [
    "tauri-apps.tauri-vscode",
    "rust-lang.rust-analyzer",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

#### Rust 配置

在 `.vscode/settings.json` 中添加：

```json
{
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.checkOnSave.command": "clippy"
}
```

---

## 项目架构说明

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    ClawStation Application                   │
├─────────────────────────────────────────────────────────────┤
│  Frontend (WebView)                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ Chat Panel  │ │Canvas Panel │ │    File Browser         ││
│  │ (React)     │ │(iframe/WV)  │ │    (React)              ││
│  └──────┬──────┘ └──────┬──────┘ └───────────┬─────────────┘│
├─────────┼───────────────┼────────────────────┼──────────────┤
│  Tauri Commands (Rust Backend)                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ gateway.rs   │ │ canvas.rs    │ │ files.rs             │ │
│  │ - WS connect │ │ - navigate   │ │ - read/write         │ │
│  │ - sessions   │ │ - eval       │ │ - list directories   │ │
│  │ - messages   │ │ - snapshot   │ │ - watch changes      │ │
│  └──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘ │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   OpenClaw Gateway                           │
│  ws://127.0.0.1:18789                                        │
│  ├─ WebSocket Control Plane                                  │
│  ├─ HTTP API (/v1/chat/completions, /v1/responses)          │
│  └─ Canvas Host (:18793)                                     │
└─────────────────────────────────────────────────────────────┘
```

### 通信流程

```
Frontend (React) 
    ↓ invoke()
Tauri Bridge (IPC)
    ↓
Backend (Rust)
    ↓ WebSocket
OpenClaw Gateway
```

---

## 前端架构

### 技术栈

- **React 18** - UI 框架，使用函数组件和 Hooks
- **TypeScript 5** - 类型安全
- **TailwindCSS 3** - 原子化 CSS
- **Zustand 4** - 轻量级状态管理
- **React Query 5** - 服务端状态管理

### 目录结构

```
src/
├── components/           # React 组件
│   ├── layout/          # 布局组件
│   ├── chat/            # 聊天相关
│   ├── session/         # 会话管理
│   ├── canvas/          # Canvas 面板
│   ├── files/           # 文件浏览器
│   └── scene3d/         # 3D 场景
├── stores/              # Zustand 状态
├── lib/                 # 工具函数
├── types/               # TypeScript 类型
└── styles/              # 全局样式
```

### 状态管理 (Zustand)

#### Session Store

```typescript
// src/stores/sessionStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Session {
  key: string;
  agentId: string;
  displayName: string;
  model: string;
  totalTokens: number;
  updatedAt: number;
  messages: Message[];
}

interface SessionStore {
  sessions: Map<string, Session>;
  activeSessionKey: string | null;
  activeAgentId: string;
  
  // Actions
  setActiveSession: (key: string) => void;
  setActiveAgent: (agentId: string) => void;
  loadSessions: (agentId: string) => Promise<void>;
  createSession: (agentId: string) => Promise<string>;
  addMessage: (sessionKey: string, message: Message) => void;
}

export const useSessionStore = create<SessionStore>()(
  immer((set, get) => ({
    sessions: new Map(),
    activeSessionKey: null,
    activeAgentId: 'main',
    
    setActiveSession: (key) => {
      set((state) => {
        state.activeSessionKey = key;
      });
    },
    
    setActiveAgent: (agentId) => {
      set((state) => {
        state.activeAgentId = agentId;
        state.activeSessionKey = null;
      });
    },
    
    loadSessions: async (agentId) => {
      const sessions = await api.sessions.list({ agentId });
      set((state) => {
        sessions.forEach((s) => state.sessions.set(s.key, s));
      });
    },
    
    // ... 其他 actions
  }))
);
```

#### Agent Store

```typescript
// src/stores/agentStore.ts
interface AgentStore {
  agents: AgentInfo[];
  currentAgentId: string;
  
  loadAgents: () => Promise<void>;
  switchAgent: (agentId: string) => Promise<void>;
}
```

#### Settings Store

```typescript
// src/stores/settingsStore.ts
interface SettingsStore {
  theme: 'light' | 'dark' | 'system';
  gateway: GatewayConfig;
  
  setTheme: (theme: SettingsStore['theme']) => void;
  updateGateway: (config: Partial<GatewayConfig>) => void;
}
```

### 组件设计

#### 布局组件

```typescript
// src/components/layout/MainLayout.tsx
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SessionTabs } from '../session/SessionTabs';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar className="w-64 flex-shrink-0" />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <SessionTabs />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
};
```

#### 聊天面板

```typescript
// src/components/chat/ChatPanel.tsx
import { useSessionStore } from '@/stores/sessionStore';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';

export const ChatPanel: React.FC = () => {
  const { activeSessionKey, sessions } = useSessionStore();
  const session = activeSessionKey ? sessions.get(activeSessionKey) : null;
  
  if (!session) {
    return <EmptyState />;
  }
  
  return (
    <div className="flex flex-col h-full">
      <MessageList messages={session.messages} />
      <InputArea sessionKey={session.key} />
    </div>
  );
};
```

### API 客户端

```typescript
// src/lib/gateway-client.ts
import { invoke } from '@tauri-apps/api/tauri';
import type * as types from '@/types/api';

export const gatewayClient = {
  // Gateway
  connect: (config: types.GatewayConfig) => 
    invoke<void>('connect', { config }),
  
  disconnect: () => 
    invoke<void>('disconnect'),
  
  getStatus: () => 
    invoke<types.GatewayStatus>('get_status'),
  
  // Sessions
  listSessions: (agentId?: string) => 
    invoke<types.Session[]>('list_sessions', { agentId }),
  
  getHistory: (sessionKey: string, limit?: number) => 
    invoke<types.Message[]>('get_history', { sessionKey, limit }),
  
  sendMessage: (sessionKey: string, message: string) => 
    invoke<void>('send_message', { sessionKey, message }),
  
  // Canvas
  canvasNavigate: (sessionId: string, url: string) => 
    invoke<void>('canvas_navigate', { sessionId, url }),
  
  // Files
  listWorkspace: (agentId: string, path?: string) => 
    invoke<types.FileInfo[]>('list_workspace', { agentId, path }),
  
  readFile: (agentId: string, path: string) => 
    invoke<string>('read_file', { agentId, path }),
};
```

---

## 后端架构

### 技术栈

- **Tauri 2.0** - 桌面应用框架
- **Rust 1.77+** - 系统编程语言
- **Tokio** - 异步运行时
- **serde** - 序列化

### 目录结构

```
src-tauri/src/
├── main.rs              # 入口点
├── lib.rs               # 库导出
├── gateway/             # Gateway 模块
│   ├── mod.rs
│   ├── connection.rs    # WebSocket 连接
│   └── protocol.rs      # 协议定义
├── sessions/            # 会话管理
│   ├── mod.rs
│   ├── manager.rs
│   └── history.rs
├── canvas/              # Canvas 模块
│   ├── mod.rs
│   ├── panel.rs
│   └── a2ui.rs
├── files/               # 文件操作
│   ├── mod.rs
│   ├── browser.rs
│   └── watcher.rs
└── agents/              # Agent 管理
    ├── mod.rs
    └── switcher.rs
```

### 模块详解

#### Gateway 模块

```rust
// src-tauri/src/gateway/mod.rs
use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct GatewayConfig {
    pub url: String,
    pub token: String,
    pub agent_id: String,
    pub canvas_port: u32,
}

#[derive(Debug, Serialize)]
pub struct GatewayStatus {
    pub connected: bool,
    pub url: Option<String>,
    pub agent_id: Option<String>,
    pub protocol: Option<u32>,
}

// 命令处理器
#[tauri::command]
pub async fn connect(
    config: GatewayConfig,
    state: State<'_, GatewayState>,
) -> Result<(), String> {
    let mut conn = state.connection.lock().await;
    conn.connect(config).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disconnect(
    state: State<'_, GatewayState>,
) -> Result<(), String> {
    let mut conn = state.connection.lock().await;
    conn.disconnect().await;
    Ok(())
}

#[tauri::command]
pub async fn get_status(
    state: State<'_, GatewayState>,
) -> Result<GatewayStatus, String> {
    let conn = state.connection.lock().await;
    Ok(conn.get_status())
}
```

#### Sessions 模块

```rust
// src-tauri/src/sessions/mod.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub key: String,
    pub agent_id: String,
    pub display_name: String,
    pub model: String,
    pub total_tokens: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: Vec<ContentPart>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ContentPart {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image")]
    Image { image: String },
    #[serde(rename = "toolCall")]
    ToolCall { id: String, name: String, arguments: serde_json::Value },
}

#[tauri::command]
pub async fn list_sessions(
    agent_id: Option<String>,
    state: State<'_, SessionState>,
) -> Result<Vec<Session>, String> {
    state.list_sessions(agent_id).await
}

#[tauri::command]
pub async fn send_message(
    session_key: String,
    message: String,
    state: State<'_, SessionState>,
) -> Result<(), String> {
    state.send_message(&session_key, &message).await
}
```

#### Canvas 模块

```rust
// src-tauri/src/canvas/mod.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct CanvasState {
    pub session_id: String,
    pub url: Option<String>,
    pub visible: bool,
}

#[tauri::command]
pub async fn canvas_navigate(
    session_id: String,
    url: String,
    state: State<'_, CanvasState>,
) -> Result<(), String> {
    // 导航到指定 URL
    state.navigate(&session_id, &url).await
}

#[tauri::command]
pub async fn canvas_eval(
    session_id: String,
    javascript: String,
    state: State<'_, CanvasState>,
) -> Result<serde_json::Value, String> {
    // 在 Canvas 中执行 JavaScript
    state.eval(&session_id, &javascript).await
}

#[tauri::command]
pub async fn canvas_snapshot(
    session_id: String,
    format: Option<String>,
    state: State<'_, CanvasState>,
) -> Result<Vec<u8>, String> {
    // 截取 Canvas 截图
    state.snapshot(&session_id, format.as_deref().unwrap_or("png")).await
}
```

#### Files 模块

```rust
// src-tauri/src/files/mod.rs
use serde::Serialize;
use std::path::PathBuf;

#[derive(Debug, Serialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub modified: Option<u64>,
    pub mime_type: Option<String>,
}

#[tauri::command]
pub async fn list_workspace(
    agent_id: String,
    path: Option<String>,
) -> Result<Vec<FileInfo>, String> {
    let workspace = get_workspace_path(&agent_id);
    let target = match path {
        Some(p) => workspace.join(p),
        None => workspace,
    };
    
    // 列出目录内容
    list_directory(&target).await
}

#[tauri::command]
pub async fn read_file(
    agent_id: String,
    path: String,
    offset: Option<usize>,
    limit: Option<usize>,
) -> Result<String, String> {
    let workspace = get_workspace_path(&agent_id);
    let file_path = workspace.join(&path);
    
    // 读取文件内容
    read_text_file(&file_path, offset, limit).await
}

fn get_workspace_path(agent_id: &str) -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".openclaw")
        .join("agents")
        .join(agent_id)
        .join("workspace")
}
```

### 命令注册

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod gateway;
mod sessions;
mod canvas;
mod files;
mod agents;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .manage(gateway::GatewayState::default())
        .manage(sessions::SessionState::default())
        .manage(canvas::CanvasState::default())
        .invoke_handler(tauri::generate_handler![
            // Gateway
            gateway::connect,
            gateway::disconnect,
            gateway::get_status,
            
            // Sessions
            sessions::list_sessions,
            sessions::get_history,
            sessions::send_message,
            sessions::abort_session,
            sessions::create_session,
            sessions::spawn_subagent,
            
            // Canvas
            canvas::canvas_present,
            canvas::canvas_navigate,
            canvas::canvas_eval,
            canvas::canvas_snapshot,
            canvas::a2ui_push,
            
            // Files
            files::list_workspace,
            files::read_file,
            files::read_image,
            files::watch_directory,
            files::unwatch_directory,
            
            // Agents
            agents::list_agents,
            agents::switch_agent,
            agents::get_agent_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## API 接口说明

### Gateway 模块

| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `connect` | `config: GatewayConfig` | `void` | 连接 Gateway |
| `disconnect` | - | `void` | 断开连接 |
| `get_status` | - | `GatewayStatus` | 获取连接状态 |

### Session 模块

| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `list_sessions` | `agentId?: string` | `Session[]` | 列出会话 |
| `get_history` | `sessionKey, limit?` | `Message[]` | 获取历史 |
| `send_message` | `sessionKey, message` | `void` | 发送消息 |
| `abort_session` | `sessionKey` | `{ stopped: number }` | 中止会话 |
| `create_session` | `agentId, model?` | `{ sessionKey }` | 创建会话 |
| `spawn_subagent` | `task, agentId, ...` | `{ sessionKey, runId }` | 启动子 Agent |

### Canvas 模块

| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `canvas_present` | `sessionId, url?` | `CanvasState` | 显示 Canvas |
| `canvas_navigate` | `sessionId, url` | `void` | 导航 |
| `canvas_eval` | `sessionId, javascript` | `unknown` | 执行 JS |
| `canvas_snapshot` | `sessionId, format?` | `number[]` | 截图 |
| `a2ui_push` | `sessionId, commands` | `void` | 推送 A2UI |

### Files 模块

| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `list_workspace` | `agentId, path?` | `FileInfo[]` | 列出文件 |
| `read_file` | `agentId, path, ...` | `string` | 读取文件 |
| `read_image` | `agentId, path` | `{ data, width, height }` | 读取图片 |
| `watch_directory` | `agentId, path` | `void` | 监听目录 |
| `unwatch_directory` | `agentId, path` | `void` | 取消监听 |

### Agents 模块

| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `list_agents` | - | `AgentInfo[]` | 列出 Agents |
| `switch_agent` | `agentId` | `{ previous, current }` | 切换 Agent |
| `get_agent_config` | `agentId` | `AgentConfig` | 获取配置 |

---

## 调试技巧

### 前端调试

#### 1. 开启 React DevTools

```bash
# 安装浏览器扩展
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/

# 在代码中启用
import { setupReactDevTools } from 'zustand/middleware';
```

#### 2. 使用 Zustand DevTools

```typescript
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools(
    (set) => ({ ... }),
    { name: 'SessionStore' }
  )
);
```

#### 3. 日志调试

```typescript
// src/lib/logger.ts
export const logger = {
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log('[ClawStation]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[ClawStation]', ...args);
  },
};
```

### 后端调试

#### 1. Rust 日志

```rust
// 在 main.rs 中设置日志级别
fn main() {
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("debug")
    ).init();
    
    log::debug!("Starting ClawStation...");
}
```

#### 2. 使用 dbg! 宏

```rust
#[tauri::command]
pub async fn connect(config: GatewayConfig) -> Result<(), String> {
    dbg!(&config);  // 打印变量
    
    // 或者使用 log
    log::info!("Connecting to gateway: {}", config.url);
    
    // ...
}
```

#### 3. VS Code 调试配置

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Tauri",
      "cargo": {
        "args": ["build", "--manifest-path=src-tauri/Cargo.toml"]
      },
      "args": [],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

### 常见问题

#### 1. WebSocket 连接失败

```bash
# 检查 Gateway 是否运行
curl http://127.0.0.1:18789/health

# 检查端口占用
lsof -i :18789
```

#### 2. 热重载失效

```bash
# 重启开发服务器
npm run tauri:dev

# 清除缓存
rm -rf node_modules/.vite
```

#### 3. Rust 编译错误

```bash
# 清理并重新构建
cd src-tauri
cargo clean
cargo build
```

---

## 性能优化

### 前端优化

1. **虚拟列表** - 大量消息时使用 react-window
2. **防抖节流** - 输入和滚动事件
3. **代码分割** - 使用 React.lazy 和 Suspense
4. **Memoization** - 使用 React.memo 和 useMemo

### 后端优化

1. **连接池** - WebSocket 连接复用
2. **异步处理** - 使用 tokio::spawn
3. **缓存** - 会话列表缓存
4. **限流** - 消息发送频率控制

---

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

*最后更新: 2026-02-23*
