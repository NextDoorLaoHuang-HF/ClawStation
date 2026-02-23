# ClawStation 用户使用手册

> OpenClaw 桌面客户端 - AI 工作站

---

## 目录

1. [安装与启动](#安装与启动)
2. [配置网关连接](#配置网关连接)
3. [多网关管理](#多网关管理)
4. [会话管理](#会话管理)
5. [Canvas 可视化](#canvas-可视化)
6. [文件浏览](#文件浏览)
7. [插件系统](#插件系统)
8. [常见问题](#常见问题)

---

## 安装与启动

### 系统要求

| 系统 | 最低版本 |
|------|----------|
| Windows | Windows 7+ |
| macOS | macOS 10.15+ |
| Linux | Ubuntu 18.04+ / Fedora 30+ |

### 安装方式

#### 方式一：下载发布版本

从 [GitHub Releases](https://github.com/NextDoorLaoHuang-HF/ClawStation/releases) 下载对应平台的安装包：

- **Windows**: `ClawStation_x.x.x_x64-setup.exe`
- **macOS**: `ClawStation_x.x.x_x64.dmg`
- **Linux**: `ClawStation_x.x.x_amd64.AppImage`

#### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/NextDoorLaoHuang-HF/ClawStation.git
cd ClawStation

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建发布版本
npm run tauri build
```

### 首次启动

首次启动时，ClawStation 会显示网关配置界面，引导你添加第一个 OpenClaw Gateway。

---

## 配置网关连接

### 什么是 Gateway？

OpenClaw Gateway 是 AI Agent 的后端服务，ClawStation 作为前端客户端连接到 Gateway。

默认 Gateway 地址：
- **WebSocket**: `ws://127.0.0.1:18789`
- **Canvas**: `http://127.0.0.1:18793`

### 添加网关

1. 点击右上角 **齿轮图标** 打开设置
2. 选择 **网关配置** 选项卡
3. 点击 **添加网关** 按钮
4. 填写网关信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| 名称 | 网关显示名称 | `本地网关` |
| URL | WebSocket 地址 | `ws://127.0.0.1:18789` |
| Token | 认证令牌（可选） | `your-token-here` |
| Canvas 端口 | Canvas 服务端口 | `18793` |

5. 点击 **保存**

### 连接网关

1. 在网关列表中找到目标网关
2. 点击 **连接** 按钮
3. 状态指示器变为绿色表示连接成功

---

## 多网关管理

### 为什么需要多网关？

- **开发/生产环境隔离**
- **不同项目使用不同 Agent**
- **负载均衡和高可用**

### 设置默认网关

1. 在网关列表中找到目标网关
2. 点击 **设为默认** 按钮
3. 下次启动时自动连接默认网关

### 快速切换网关

使用顶部工具栏的 **网关选择器**：

1. 点击当前网关名称
2. 从下拉列表选择目标网关
3. 自动断开当前连接并连接新网关

### 网关状态

| 状态 | 颜色 | 说明 |
|------|------|------|
| 已连接 | 🟢 绿色 | 正常工作 |
| 连接中 | 🟡 黄色 | 正在建立连接 |
| 已断开 | ⚪ 灰色 | 未连接 |
| 错误 | 🔴 红色 | 连接失败 |

---

## 会话管理

### 创建新会话

1. 点击左侧边栏的 **+ 新建会话** 按钮
2. 选择要使用的 Agent
3. （可选）选择模型
4. 开始对话

### 会话标签页

- 支持同时打开多个会话
- 点击标签页切换会话
- 右键标签页可关闭或重命名

### 会话历史

- 会话历史自动保存
- 点击左侧会话列表查看历史
- 支持搜索历史消息

### 多会话并行

ClawStation 支持同时运行多个 Agent 会话：

1. 创建新会话时选择不同的 Agent
2. 各会话独立运行，互不干扰
3. 可在不同会话间快速切换

---

## Canvas 可视化

### 什么是 Canvas？

Canvas 是 OpenClaw 的可视化渲染面板，支持：

- **A2UI 界面渲染** - Agent 生成的动态界面
- **图表展示** - 数据可视化
- **自定义组件** - 插件扩展

### 使用 Canvas

1. Agent 发送 Canvas 指令时自动打开 Canvas 面板
2. Canvas 面板显示在聊天区域右侧
3. 支持刷新、截图、全屏操作

### Canvas 工具栏

| 按钮 | 功能 |
|------|------|
| 🔄 | 刷新 Canvas |
| 📷 | 截图保存 |
| ⛶ | 全屏模式 |
| ✕ | 关闭 Canvas |

---

## 文件浏览

### 打开文件浏览器

1. 点击左侧边栏的 **文件** 图标
2. 选择要浏览的 Agent 工作区
3. 浏览文件和目录

### 文件操作

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 打开文件 | Enter / 双击 | 在编辑器中打开 |
| 预览 | Space | 快速预览 |
| 复制路径 | Ctrl+C | 复制文件路径 |
| 刷新 | F5 | 刷新文件列表 |

### 支持的文件类型

- **文本文件**: `.txt`, `.md`, `.json`, `.yaml`, `.toml`
- **代码文件**: `.js`, `.ts`, `.py`, `.rs`, `.go`
- **图片文件**: `.png`, `.jpg`, `.gif`, `.webp`
- **其他**: 任何文本格式文件

### 文件监听

启用文件监听后，文件变化会实时同步到 Agent：

1. 右键文件或目录
2. 选择 **启用监听**
3. 文件变化自动通知 Agent

---

## 插件系统

### 安装插件

1. 打开设置 → 插件管理
2. 点击 **安装插件**
3. 选择插件源：
   - 本地目录
   - Git 仓库 URL
   - 插件市场（计划中）
4. 确认安装

### 管理插件

| 操作 | 说明 |
|------|------|
| 启用/禁用 | 切换插件激活状态 |
| 卸载 | 移除插件 |
| 配置 | 打开插件设置 |
| 更新 | 更新到最新版本 |

### 插件类型

| 类型 | 说明 |
|------|------|
| UI 插件 | 扩展界面功能 |
| 命令插件 | 添加自定义命令 |
| Canvas 插件 | 扩展 Canvas 渲染 |
| 集成插件 | 第三方服务集成 |

---

## 常见问题

### Q: 无法连接到 Gateway？

**检查清单**：

1. 确认 Gateway 服务已启动
   ```bash
   openclaw gateway status
   ```

2. 检查端口是否被占用
   ```bash
   # Linux/macOS
   lsof -i :18789
   
   # Windows
   netstat -ano | findstr :18789
   ```

3. 检查防火墙设置

4. 验证 URL 格式正确（`ws://` 前缀）

### Q: 会话消息丢失？

会话消息存储在 Gateway 端，请检查：

1. Gateway 是否正常运行
2. 会话是否正确保存
3. 查看会话历史记录

### Q: Canvas 不显示？

1. 检查 Canvas 端口配置是否正确
2. 确认 Agent 发送了有效的 A2UI 指令
3. 尝试刷新 Canvas 面板

### Q: 如何重置配置？

配置文件位置：
- **Linux/macOS**: `~/.config/openclaw/clawstation/`
- **Windows**: `%APPDATA%\openclaw\clawstation\`

删除该目录下的配置文件即可重置。

### Q: 如何查看日志？

日志文件位置：
- **Linux/macOS**: `~/.local/share/openclaw/clawstation/logs/`
- **Windows**: `%APPDATA%\openclaw\clawstation\logs\`

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + N` | 新建会话 |
| `Ctrl/Cmd + W` | 关闭当前会话 |
| `Ctrl/Cmd + Tab` | 切换会话标签 |
| `Ctrl/Cmd + Shift + G` | 打开网关选择器 |
| `Ctrl/Cmd + ,` | 打开设置 |
| `F5` | 刷新 Canvas |
| `F11` | 全屏模式 |

---

## 获取帮助

- **文档**: https://docs.openclaw.ai
- **GitHub**: https://github.com/NextDoorLaoHuang-HF/ClawStation
- **社区**: https://discord.com/invite/clawd
- **问题反馈**: https://github.com/NextDoorLaoHuang-HF/ClawStation/issues

---

*ClawStation v1.0.0 | 最后更新: 2026-02-24*
