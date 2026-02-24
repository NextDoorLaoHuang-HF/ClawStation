# Flaky Tests

本文件用于记录**已知不稳定（flaky）**的测试，避免“偶发失败”长期阻塞合并。

## 记录格式

```md
- Test: path/to/test-file.test.tsx :: "test name"
  Symptom: intermittent timeout / race / env dependency
  Frequency: ~1/20
  Workaround: re-run once; increase timeout; stabilize mock
  Owner: @name
  Tracking: #issue-id
```

## 处理原则

- 优先让测试变稳定；临时方案是标记并记录原因与所有者。
- 不允许“静默忽略”：必须有 issue/跟踪信息。

