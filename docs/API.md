# API

本项目是 Tauri 2 桌面应用：前端通过 `@tauri-apps/api/core` 的 `invoke()` 调用后端 Rust 的 `#[tauri::command]` 接口。

## 前端调用位置

- 推荐集中封装在 `src/lib/api.ts`（或新增独立模块），UI/Store 通过封装层调用，避免在组件内散落 `invoke()`。
- 示例（见 `src/components/files/FileBrowser.tsx`）：

```ts
import { invoke } from '@tauri-apps/api/core'

await invoke('list_workspace', { agentId, path })
```

## 后端命令模块

命令实现位于 `src-tauri/src/`，常用入口：

- `src-tauri/src/gateway.rs`: `connect`, `disconnect`, `get_status`, 以及 profile 管理（`list_gateway_profiles` 等）
- `src-tauri/src/sessions.rs`: `list_sessions`, `get_history`, `send_message`, `abort_session`, `create_session`, `spawn_subagent`
- `src-tauri/src/files.rs`: `list_workspace`, `read_file`, `read_image`, `watch_directory`, `unwatch_directory`
- `src-tauri/src/canvas.rs`: `canvas_present`, `canvas_navigate`, `canvas_eval`, `canvas_snapshot`, `a2ui_push`
- `src-tauri/src/agents.rs`: `list_agents`, `switch_agent`, `get_agent_config`
- `src-tauri/src/settings.rs`: `get_settings`, `update_settings`
- `src-tauri/src/system.rs`: `get_app_info`, `open_external`, `check_update`, `install_update`
- `src-tauri/src/plugins/commands.rs`: `list_plugins`, `install_plugin`, `uninstall_plugin`, `enable_plugin`, `disable_plugin`, `reload_plugin`, `get_plugin_contributions`

## 约定

- **命令名**：以 Rust 的函数名为准（字符串要与之保持一致）。
- **类型**：前端类型放在 `src/types/`；跨层共享类型尽量从这里引入。
- **变更**：新增/重命名命令时，同步更新此文档与前端调用点，并补充测试/手动验证步骤。

## 自动生成索引

```bash
./scripts/generate-api-docs.sh
```

输出：`docs/api/tauri-commands.md`
