# 贡献指南

感谢你对 ClawStation 的兴趣！本文档将帮助你参与项目开发。

---

## 行为准则

- 尊重所有贡献者
- 建设性的批评和反馈
- 关注项目目标，而非个人

---

## 如何贡献

### 报告 Bug

1. 搜索 [现有 Issues](https://github.com/NextDoorLaoHuang-HF/ClawStation/issues) 避免重复
2. 创建新 Issue，包含：
   - 清晰的标题
   - 复现步骤
   - 预期行为 vs 实际行为
   - 环境信息（OS、版本）

### 提交功能建议

1. 先讨论（创建 Issue）
2. 描述使用场景
3. 等待维护者反馈
4. 获得批准后再开发

### 提交代码

#### 1. Fork 并克隆

```bash
git clone https://github.com/YOUR_USERNAME/ClawStation.git
cd ClawStation
git remote add upstream https://github.com/NextDoorLaoHuang-HF/ClawStation.git
```

#### 2. 开发前检查

在推送代码前，**必须**运行完整检查：

```bash
# 运行所有检查（前端 + 后端）
npm run check

# 或手动运行
./scripts/pre-push-check.sh
```

此脚本会自动运行：
- ✅ TypeScript 类型检查
- ✅ ESLint 代码检查
- ✅ 前端单元测试
- ✅ Rust 格式化检查
- ✅ Clippy 静态分析
- ✅ Rust 单元测试

**如果检查失败，推送将被阻止。**

#### 3. 创建分支

```bash
git checkout -b feature/your-feature-name
```

分支命名规范：
- `feature/` - 新功能
- `fix/` - Bug 修复
- `docs/` - 文档更新
- `refactor/` - 代码重构

#### 3. 开发

确保：
- 代码格式化：`npm run format`
- Lint 通过：`npm run lint`
- 测试通过：`npm run test`
- 类型检查：`npm run type-check`

#### 4. 提交

使用约定式提交：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档
- `style` - 格式
- `refactor` - 重构
- `test` - 测试
- `chore` - 构建/工具

示例：
```
feat(chat): add markdown rendering

- Support code blocks with syntax highlighting
- Support tables and lists
- Add copy button for code blocks

Closes #123
```

#### 5. 推送并创建 PR

```bash
git push origin feature/your-feature-name
```

在 GitHub 创建 Pull Request，填写模板。

---

## 开发环境设置

### 前提条件

- Node.js ^20.19.0 或 >=22.12.0（推荐使用 `.nvmrc` 指定的版本）
- Rust 1.77+
- npm（仓库包含 `package-lock.json`，CI 默认使用 npm）

### 安装步骤

```bash
# 安装依赖
npm ci

# 启动开发服务器
npm run tauri:dev
```

### 项目结构

```
clawstation/
├── src/              # 前端 React 代码
├── src-tauri/        # 后端 Rust 代码
├── docs/             # 文档
└── scripts/          # 工具脚本
```

---

## 代码规范

### TypeScript

- 使用函数式组件 + Hooks
- 优先使用 `interface` 定义类型
- 导出组件使用 `export default`
- 组件文件使用 PascalCase

```typescript
// ✅ Good
interface ChatPanelProps {
  sessionId: string;
}

export default function ChatPanel({ sessionId }: ChatPanelProps) {
  // ...
}

// ❌ Bad
type ChatPanelProps = { sessionId: string }
export const ChatPanel = ({ sessionId }) => { ... }
```

### Rust

- 遵循 Rust API 指南
- 使用 `thiserror` 定义错误类型
- 公开 API 必须有文档注释
- 单元测试与代码同文件

```rust
/// Creates a new session for the specified agent.
///
/// # Arguments
/// * `agent_id` - The agent identifier
///
/// # Returns
/// The created session
pub fn create_session(&mut self, agent_id: &str) -> Result<Session> {
    // ...
}
```

---

## 测试规范

### 单元测试

```typescript
// 前端
describe('SessionStore', () => {
  it('should create session', () => {
    const store = useSessionStore.getState();
    const session = store.createSession('test-agent');
    expect(session.agentId).toBe('test-agent');
  });
});
```

```rust
// 后端
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_create_session() {
        let mut manager = SessionManager::new();
        let session = manager.create_session("test-agent").unwrap();
        assert_eq!(session.agent_id, "test-agent");
    }
}
```

### 测试覆盖率

当前门禁：前端覆盖率阈值由 `vitest.config.ts` 强制（后续逐步提升）。
长期目标：≥80%（见 `docs/ROADMAP.md` / `docs/QUALITY-IMPROVEMENT.md`）。

```bash
# 前端
npm run test:coverage

# 后端
cargo tarpaulin
```

---

## 文档规范

- README.md - 项目介绍
- docs/DEVELOPMENT.md - 开发指南
- docs/API.md - API 文档
- 代码注释 - 复杂逻辑说明

---

## 审查流程

1. 自动 CI 检查（必需）
2. 至少 1 位维护者审查
3. 解决所有评论
4. Squash 合并

---

## 获取帮助

- [GitHub Discussions](https://github.com/NextDoorLaoHuang-HF/ClawStation/discussions)
- [Discord](https://discord.com/invite/clawd)

---

感谢你的贡献！🎉
