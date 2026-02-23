# ClawStation 开发工作流

> 基于 OpenAI "Harness Engineering" 原则

---

## 核心理念

**"在等待成本高的系统中，修正成本反而低"**

- 最小化阻塞性合并关卡
- PR 生命周期短
- 测试不稳定用重新运行解决，而非无限期阻塞

---

## 开发流程

### 传统流程（慢）

```
开发 → 代码审查 → 测试 → 审批 → 合并
      (1-2天)    (几小时) (等待)
```

### 快速合并流程（快）

```
开发 → 自审 → 自动测试 → 合并
     (10分钟) (自动)    (立即)
```

---

## 代理自审清单

### 提交 PR 前，代理必须检查：

```markdown
## 自审清单

- [ ] 代码风格
  - [ ] `cargo fmt` 通过
  - [ ] `npm run lint` 通过
  
- [ ] 类型检查
  - [ ] `cargo clippy` 无错误
  - [ ] TypeScript 编译通过
  
- [ ] 测试
  - [ ] 单元测试通过
  - [ ] 集成测试通过（如有）
  
- [ ] 文档
  - [ ] API 变更有文档
  - [ ] 复杂逻辑有注释
  
- [ ] 架构
  - [ ] 分层依赖正确
  - [ ] 无循环依赖
```

---

## 快速合并规则

### ✅ 可立即合并

- 所有自审项通过
- CI 自动测试通过
- 无 breaking changes

### ⚠️ 需人工审查

- API 变更
- 安全相关修改
- 架构变更

### ❌ 禁止合并

- CI 失败
- 类型错误
- 测试失败

---

## CI/CD 配置

### 自动合并条件

```yaml
# .github/workflows/auto-merge.yml
name: Auto Merge

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  auto-merge:
    if: |
      github.event.pull_request.user.login == 'dependabot[bot]' ||
      contains(github.event.pull_request.labels.*.name, 'auto-merge')
    runs-on: ubuntu-latest
    steps:
      - name: Check CI status
        run: |
          # 等待 CI 完成
          sleep 60
          
      - name: Auto merge
        uses: pascalgn/automerge-action@v0.15.6
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          MERGE_LABELS: ""
          MERGE_METHOD: squash
```

---

## PR 模板

```markdown
## 变更类型
- [ ] 🐛 Bug 修复
- [ ] ✨ 新功能
- [ ] 📝 文档更新
- [ ] 🔧 重构

## 自审清单
- [ ] 代码风格检查通过
- [ ] 测试通过
- [ ] 文档已更新

## 测试截图
（如有 UI 变更，附截图）

## 相关 Issue
Fixes #
```

---

## 多代理审查

### 本地审查（代理自审）

```bash
# 运行完整审查
./scripts/self-review.sh
```

### 云端审查（CI）

```yaml
# GitHub Actions 自动审查
- name: Review
  run: |
    npm run lint
    npm run test
    npm run build
```

---

## 错误处理

### CI 失败时

1. **自动重新运行**（最多 2 次）
2. 失败后通知开发者
3. 开发者修复后立即重新运行

### 测试不稳定时

- 标记为 `flaky`
- 记录到 `FLAKY_TESTS.md`
- 不阻塞合并

---

*此文档指导日常开发流程*
