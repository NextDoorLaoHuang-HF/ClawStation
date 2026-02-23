# ClawStation 插件开发指南

> 本文档介绍 ClawStation 插件系统的架构和开发方法。

---

## 📋 目录

1. [插件系统概述](#插件系统概述)
2. [如何开发插件](#如何开发插件)
3. [插件 API 参考](#插件-api-参考)
4. [示例插件代码](#示例插件代码)

---

## 插件系统概述

### 设计目标

ClawStation 作为专业工作站（Station），支持用户自定义插件扩展，实现高度可定制的工作流：

- 🔌 **热插拔** - 无需重启即可加载/卸载插件
- 🎨 **UI 扩展** - 支持添加自定义面板、组件
- ⚙️ **功能扩展** - 支持注册新命令、工具
- 🔗 **集成扩展** - 支持连接第三方服务
- 🎭 **主题扩展** - 支持自定义外观

### 插件架构

```
┌─────────────────────────────────────────────────────────────┐
│                      ClawStation Core                        │
├─────────────────────────────────────────────────────────────┤
│  Plugin Manager                                              │
│  ├─ Plugin Registry（插件注册表）                            │
│  ├─ Plugin Loader（插件加载器）                              │
│  ├─ Plugin Sandbox（插件沙箱）                               │
│  └─ Plugin API（插件 API）                                   │
├─────────────────────────────────────────────────────────────┤
│  Extension Points（扩展点）                                  │
│  ├─ UI Extension Point                                       │
│  │   ├─ Panel（面板）                                        │
│  │   ├─ Widget（小部件）                                     │
│  │   └─ Theme（主题）                                        │
│  ├─ Command Extension Point                                  │
│  │   └─ Custom Commands（自定义命令）                        │
│  ├─ Canvas Extension Point                                   │
│  │   └─ Custom Renderers（自定义渲染器）                     │
│  └─ Integration Extension Point                              │
│      └─ Third-party Services（第三方服务）                   │
└─────────────────────────────────────────────────────────────┘
```

### 插件类型

| 类型 | 描述 | 用途 |
|------|------|------|
| **UI Plugin** | UI 扩展插件 | 添加自定义面板、组件、主题 |
| **Command Plugin** | 命令插件 | 注册自定义命令 |
| **Canvas Plugin** | Canvas 插件 | 扩展 Canvas 渲染能力 |
| **Integration Plugin** | 集成插件 | 连接第三方服务 |

---

## 如何开发插件

### 1. 创建插件目录

```bash
mkdir -p ~/.clawstation/plugins/my-plugin
cd ~/.clawstation/plugins/my-plugin
```

### 2. 创建插件清单

创建 `manifest.json`：

```json
{
  "id": "my-plugin",
  "name": "My Custom Plugin",
  "version": "1.0.0",
  "description": "A custom plugin for ClawStation",
  "author": "Your Name",
  "contributes": {
    "panels": [
      {
        "id": "my-panel",
        "title": "My Panel",
        "icon": "star",
        "position": "sidebar",
        "component": "./MyPanel.tsx"
      }
    ],
    "commands": [
      {
        "id": "myPlugin.hello",
        "name": "Say Hello",
        "keybinding": "Ctrl+Shift+H"
      }
    ]
  },
  "permissions": {
    "filesystem": {
      "read": true,
      "write": false,
      "paths": ["~/.my-plugin/*"]
    },
    "network": {
      "domains": ["api.example.com"]
    }
  }
}
```

### 3. 创建入口文件

创建 `index.ts`：

```typescript
import type { Plugin, PluginContext } from 'clawstation-api';

const plugin: Plugin = {
  async activate(context: PluginContext) {
    console.log('My plugin activated!');
    
    // 注册命令
    context.registerCommand({
      id: 'myPlugin.hello',
      name: 'Say Hello',
      handler: async () => {
        context.showMessage('Hello from my plugin!', 'info');
      }
    });
    
    // 注册面板
    context.registerPanel({
      id: 'my-panel',
      title: 'My Panel',
      icon: 'star',
      position: 'sidebar',
      component: MyPanel
    });
  },
  
  async deactivate() {
    console.log('My plugin deactivated!');
  }
};

export default plugin;
```

### 4. 创建组件

创建 `MyPanel.tsx`：

```tsx
import React from 'react';
import { usePluginContext } from 'clawstation-api';

export const MyPanel: React.FC = () => {
  const { workspace, gateway, showMessage } = usePluginContext();
  
  const handleClick = async () => {
    // 读取文件
    const content = await workspace.readFile('data.txt');
    
    // 调用 Gateway API
    const result = await gateway.invoke('someMethod', { data: content });
    
    // 显示消息
    showMessage(`Result: ${result}`, 'info');
  };
  
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">My Custom Panel</h2>
      <button 
        onClick={handleClick}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Do Something
      </button>
    </div>
  );
};
```

### 5. 安装插件

```bash
# 方法 1: 复制到插件目录
cp -r my-plugin ~/.clawstation/plugins/

# 方法 2: 使用 CLI (未来支持)
clawstation plugin install ./my-plugin

# 方法 3: 从 URL 安装 (未来支持)
clawstation plugin install https://github.com/user/my-plugin
```

### 6. 启用插件

在 ClawStation 设置中启用插件，或使用快捷键 `Ctrl+Shift+P` 打开命令面板，搜索 "Plugin Manager"。

---

## 插件 API 参考

### 核心接口

#### Plugin 接口

```typescript
interface Plugin {
  manifest: PluginManifest;
  
  // 插件激活时调用
  activate(context: PluginContext): Promise<void>;
  
  // 插件停用时调用（可选）
  deactivate?(): Promise<void>;
}
```

#### PluginManifest 接口

```typescript
interface PluginManifest {
  id: string;                    // 唯一标识符
  name: string;                  // 显示名称
  version: string;               // 版本号
  description?: string;          // 描述
  author?: string;               // 作者
  
  // 扩展点声明
  contributes: {
    panels?: PanelDefinition[];
    widgets?: WidgetDefinition[];
    themes?: ThemeDefinition[];
    commands?: CommandDefinition[];
    canvasRenderers?: CanvasRenderer[];
    services?: ServiceDefinition[];
  };
  
  // 依赖声明
  dependencies?: {
    otherPlugins?: string[];
    nodeModules?: string[];
  };
  
  // 权限声明
  permissions?: PluginPermissions;
}
```

#### PluginContext 接口

```typescript
interface PluginContext {
  // 订阅（自动清理）
  subscriptions: Disposable[];
  
  // 注册命令
  registerCommand(command: CommandDefinition): void;
  
  // 注册面板
  registerPanel(panel: PanelDefinition): void;
  
  // 注册小部件
  registerWidget(widget: WidgetDefinition): void;
  
  // 显示消息
  showMessage(message: string, type?: 'info' | 'warning' | 'error'): void;
  
  // 访问工作区
  workspace: Workspace;
  
  // 访问 Gateway
  gateway: Gateway;
}
```

### UI 扩展

#### PanelDefinition

```typescript
interface PanelDefinition {
  id: string;                    // 面板 ID
  title: string;                 // 标题
  icon: string;                  // 图标名称
  position: 'sidebar' | 'main' | 'bottom' | 'floating';
  component: React.ComponentType; // React 组件
  defaultOpen?: boolean;         // 默认是否打开
}
```

#### WidgetDefinition

```typescript
interface WidgetDefinition {
  id: string;
  name: string;
  size: 'small' | 'medium' | 'large';
  component: React.ComponentType;
}
```

#### ThemeDefinition

```typescript
interface ThemeDefinition {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts?: {
    body: string;
    heading: string;
    mono: string;
  };
}
```

### 命令扩展

```typescript
interface CommandDefinition {
  id: string;                    // 命令 ID
  name: string;                  // 显示名称
  description?: string;          // 描述
  category?: string;             // 分类
  keybinding?: string;           // 快捷键
  
  // 执行逻辑
  handler: (context: CommandContext) => Promise<void>;
  
  // UI 配置
  ui?: {
    showInPalette: boolean;      // 在命令面板显示
    showInMenu: boolean;         // 在菜单显示
    menuPath?: string[];         // 菜单路径
  };
}

interface CommandContext {
  sessionKey: string;            // 当前会话
  agentId: string;               // 当前 Agent
  selection?: unknown;           // 当前选中内容
  workspace: Workspace;          // 工作区访问
  gateway: Gateway;              // Gateway 访问
}
```

### Canvas 扩展

```typescript
interface CanvasRenderer {
  id: string;
  name: string;
  mimeType: string;              // 支持的数据类型
  
  // 渲染逻辑
  render: (data: unknown, container: HTMLElement) => void;
  
  // A2UI 组件映射（可选）
  componentMapping?: Record<string, string>;
}
```

### 集成扩展

```typescript
interface ServiceDefinition {
  id: string;
  name: string;
  icon: string;
  
  // 配置 schema
  configSchema: JSONSchema;
  
  // 连接逻辑
  connect: (config: unknown) => Promise<ServiceConnection>;
  
  // 提供的功能
  capabilities: ServiceCapability[];
}

interface ServiceConnection {
  status: 'connected' | 'disconnected' | 'error';
  disconnect: () => void;
}

interface ServiceCapability {
  type: 'read' | 'write' | 'subscribe' | 'execute';
  name: string;
  handler: (params: unknown) => Promise<unknown>;
}
```

### 权限模型

```typescript
interface PluginPermissions {
  // 文件系统访问
  filesystem?: {
    read: boolean;
    write: boolean;
    paths: string[];             // 允许的路径模式
  };
  
  // 网络访问
  network?: {
    domains: string[];           // 允许的域名
  };
  
  // Gateway 访问
  gateway?: {
    methods: string[];           // 允许调用的方法
  };
  
  // UI 访问
  ui?: {
    createPanels: boolean;
    showNotifications: boolean;
  };
}
```

### 工具函数

```typescript
// 工作区访问
interface Workspace {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDirectory(path: string): Promise<FileInfo[]>;
  watch(path: string, callback: (event: FileEvent) => void): Disposable;
}

// Gateway 访问
interface Gateway {
  invoke(method: string, params: unknown): Promise<unknown>;
  subscribe(event: string, callback: (data: unknown) => void): Disposable;
}

// 文件信息
interface FileInfo {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  modified?: number;
}

// 文件事件
interface FileEvent {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  isDir: boolean;
}

// 可释放资源
interface Disposable {
  dispose(): void;
}
```

---

## 示例插件代码

### 示例 1: 3D 模型查看器插件

```typescript
// model-viewer/index.ts
import type { Plugin, PluginContext } from 'clawstation-api';
import { ModelPanel } from './ModelPanel';

const plugin: Plugin = {
  manifest: {
    id: 'model-viewer',
    name: '3D Model Viewer',
    version: '1.0.0',
    description: 'View 3D models in ClawStation',
    contributes: {
      panels: [
        {
          id: 'model-panel',
          title: '3D Model',
          icon: 'cube',
          position: 'main',
          component: ModelPanel
        }
      ],
      commands: [
        {
          id: 'modelViewer.open',
          name: 'Open 3D Model',
          handler: async (ctx) => {
            // 打开文件选择对话框
            const path = await ctx.workspace.showOpenDialog({
              filters: [{ name: '3D Models', extensions: ['obj', 'gltf', 'glb'] }]
            });
            
            if (path) {
              // 加载模型
              await ctx.gateway.invoke('canvas_navigate', {
                url: `plugin://model-viewer/${path}`
              });
            }
          }
        }
      ]
    },
    permissions: {
      filesystem: {
        read: true,
        write: false,
        paths: ['~/.clawstation/agents/*/workspace/*']
      }
    }
  },
  
  async activate(context: PluginContext) {
    console.log('3D Model Viewer plugin activated');
  },
  
  async deactivate() {
    console.log('3D Model Viewer plugin deactivated');
  }
};

export default plugin;
```

```tsx
// model-viewer/ModelPanel.tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { usePluginContext } from 'clawstation-api';

export const ModelPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { workspace } = usePluginContext();
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 初始化 Three.js 场景
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(renderer.domElement);
    
    // 添加光源
    const light = new THREE.AmbientLight(0x404040);
    scene.add(light);
    
    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    
    return () => {
      renderer.dispose();
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-gray-900"
    />
  );
};
```

### 示例 2: Mermaid 图表渲染插件

```typescript
// mermaid-renderer/index.ts
import type { Plugin } from 'clawstation-api';
import mermaid from 'mermaid';

const plugin: Plugin = {
  manifest: {
    id: 'mermaid-renderer',
    name: 'Mermaid Diagrams',
    version: '1.0.0',
    description: 'Render Mermaid diagrams in Canvas',
    contributes: {
      canvasRenderers: [
        {
          id: 'mermaid',
          name: 'Mermaid',
          mimeType: 'application/mermaid',
          render: async (data: string, container: HTMLElement) => {
            mermaid.initialize({ startOnLoad: false });
            const { svg } = await mermaid.render('diagram', data);
            container.innerHTML = svg;
          }
        }
      ]
    }
  },
  
  async activate() {
    console.log('Mermaid renderer activated');
  }
};

export default plugin;
```

### 示例 3: GitHub 集成插件

```typescript
// github-integration/index.ts
import type { Plugin, PluginContext } from 'clawstation-api';
import { Octokit } from '@octokit/rest';

interface GitHubConfig {
  token: string;
  repo: string;
}

const plugin: Plugin = {
  manifest: {
    id: 'github-integration',
    name: 'GitHub Integration',
    version: '1.0.0',
    description: 'Integrate with GitHub',
    contributes: {
      services: [
        {
          id: 'github-api',
          name: 'GitHub API',
          icon: 'github',
          configSchema: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              repo: { type: 'string' }
            },
            required: ['token']
          },
          connect: async (config: GitHubConfig) => {
            const octokit = new Octokit({ auth: config.token });
            
            // 验证连接
            await octokit.users.getAuthenticated();
            
            return {
              status: 'connected' as const,
              disconnect: () => {},
              octokit
            };
          },
          capabilities: [
            {
              type: 'read' as const,
              name: 'getIssues',
              handler: async (params: { state?: string }) => {
                const { data } = await octokit.issues.listForRepo({
                  owner: config.repo.split('/')[0],
                  repo: config.repo.split('/')[1],
                  state: params.state || 'open'
                });
                return data;
              }
            },
            {
              type: 'write' as const,
              name: 'createIssue',
              handler: async (params: { title: string; body: string }) => {
                const { data } = await octokit.issues.create({
                  owner: config.repo.split('/')[0],
                  repo: config.repo.split('/')[1],
                  title: params.title,
                  body: params.body
                });
                return data;
              }
            }
          ]
        }
      ],
      commands: [
        {
          id: 'github.createIssue',
          name: 'Create GitHub Issue',
          handler: async (ctx) => {
            // 获取选中的文本作为 Issue 内容
            const body = ctx.selection?.toString() || '';
            
            // 调用服务
            const issue = await ctx.gateway.invoke('github-api.createIssue', {
              title: 'New Issue from ClawStation',
              body
            });
            
            ctx.showMessage(`Issue created: #${issue.number}`, 'success');
          }
        }
      ]
    },
    permissions: {
      network: {
        domains: ['api.github.com']
      }
    }
  },
  
  async activate(context: PluginContext) {
    console.log('GitHub integration activated');
  }
};

export default plugin;
```

### 示例 4: 代码格式化插件

```typescript
// code-formatter/index.ts
import type { Plugin, PluginContext } from 'clawstation-api';
import prettier from 'prettier';

const plugin: Plugin = {
  manifest: {
    id: 'code-formatter',
    name: 'Code Formatter',
    version: '1.0.0',
    description: 'Format code using Prettier',
    contributes: {
      commands: [
        {
          id: 'formatter.format',
          name: 'Format Code',
          description: 'Format selected or current file',
          keybinding: 'Ctrl+Shift+F',
          handler: async (ctx) => {
            const path = ctx.selection?.path;
            if (!path) {
              ctx.showMessage('No file selected', 'warning');
              return;
            }
            
            // 读取文件
            const code = await ctx.workspace.readFile(path);
            
            // 格式化
            const formatted = await prettier.format(code, {
              filepath: path,
              singleQuote: true,
              trailingComma: 'es5'
            });
            
            // 写回文件
            await ctx.workspace.writeFile(path, formatted);
            
            ctx.showMessage('Code formatted!', 'success');
          },
          ui: {
            showInPalette: true,
            showInMenu: true,
            menuPath: ['Edit', 'Format']
          }
        }
      ]
    },
    permissions: {
      filesystem: {
        read: true,
        write: true,
        paths: ['~/.clawstation/agents/*/workspace/*']
      }
    }
  },
  
  async activate(context: PluginContext) {
    console.log('Code formatter activated');
  }
};

export default plugin;
```

---

## 插件目录结构

```
~/.clawstation/plugins/
├── installed.json              # 已安装插件列表
├── my-plugin/
│   ├── manifest.json           # 插件清单
│   ├── index.ts                # 入口文件
│   ├── components/             # React 组件
│   │   └── MyPanel.tsx
│   ├── styles/                 # 样式
│   │   └── index.css
│   ├── assets/                 # 资源文件
│   │   └── icon.png
│   └── node_modules/           # 依赖
├── model-viewer/
│   ├── manifest.json
│   └── ...
└── github-integration/
    ├── manifest.json
    └── ...
```

---

## 插件管理 API

```typescript
interface PluginManager {
  // 列出插件
  list(): Promise<PluginInfo[]>;
  
  // 安装插件
  install(source: string): Promise<void>;
  // source: 本地路径、URL、npm 包名
  
  // 卸载插件
  uninstall(pluginId: string): Promise<void>;
  
  // 启用/禁用
  enable(pluginId: string): Promise<void>;
  disable(pluginId: string): Promise<void>;
  
  // 更新
  update(pluginId: string): Promise<void>;
  
  // 重新加载
  reload(pluginId: string): Promise<void>;
}

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  installed: boolean;
  updateAvailable: boolean;
}
```

---

## 安全注意事项

### 权限最小化原则

只申请必要的权限：

```json
{
  "permissions": {
    "filesystem": {
      "read": true,
      "write": false,  // 不需要写入就不申请
      "paths": ["~/.my-plugin/*"]  // 限制路径范围
    },
    "network": {
      "domains": ["api.example.com"]  // 限制域名
    }
  }
}
```

### 沙箱执行

插件在隔离环境中运行：

```typescript
// 插件无法直接访问：
// - Node.js 原生模块
// - 文件系统（需申请权限）
// - 网络（需申请权限）
// - 主进程 API

// 只能通过 PluginContext 提供的 API 访问
```

### 代码审查

发布到插件市场前需要：

1. 静态代码分析
2. 依赖安全检查
3. 权限审查
4. 人工审核

---

## 内置插件

ClawStation 核心功能也以插件形式实现：

| 插件 | 功能 | 类型 |
|------|------|------|
| **chat** | 聊天面板 | UI + Command |
| **canvas** | 可视化面板 | UI + Canvas |
| **file-browser** | 文件浏览器 | UI + Command |
| **agent-manager** | Agent 管理 | UI + Command |
| **session-manager** | 会话管理 | Command |
| **theme-default** | 默认主题 | Theme |

---

## 插件市场（未来规划）

```
https://market.clawstation.ai
├── Featured Plugins          # 精选插件
├── Categories                # 分类
│   ├── Productivity          # 生产力
│   ├── Visualization         # 可视化
│   ├── Integrations          # 集成
│   ├── Themes                # 主题
│   └── Developer Tools       # 开发工具
└── Search & Filter           # 搜索和筛选
```

---

## 开发路线图

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Plugin Manager 基础实现
- [ ] Plugin Manifest 解析
- [ ] Plugin Loader（支持本地插件）

### Phase 2: Extension Points (Week 3-4)
- [ ] UI Extension Point（面板注册）
- [ ] Command Extension Point（命令注册）
- [ ] Canvas Extension Point（渲染器注册）

### Phase 3: Security & Sandbox (Week 5-6)
- [ ] Permission Model 实现
- [ ] Plugin Sandbox（WebWorker）
- [ ] 安全审查机制

### Phase 4: Ecosystem (Week 7-8)
- [ ] 内置插件迁移
- [ ] 插件开发文档
- [ ] 插件模板项目

---

*最后更新: 2026-02-23*
