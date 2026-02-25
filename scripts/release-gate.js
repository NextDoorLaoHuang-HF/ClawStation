#!/usr/bin/env node
/**
 * Release gate: fail fast on high-risk placeholders in critical user paths.
 *
 * This is intentionally targeted (not a blanket "no TODOs") to avoid noise.
 */

import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8')
}

function checkFile(relPath, forbidden) {
  const issues = []
  const content = readText(relPath)
  for (const rule of forbidden) {
    const match = content.match(rule.re)
    if (match) {
      issues.push({
        file: relPath,
        message: rule.message,
        hint: rule.hint
      })
    }
  }
  return issues
}

function main() {
  const checks = [
    {
      file: 'src/components/layout/Header.tsx',
      forbidden: [
        {
          re: /Mock\s*连接状态/i,
          message: 'Header 仍包含 mock 连接状态标记',
          hint: '请使用 useGatewayStore 的真实连接状态渲染'
        },
        {
          re: /\bconst\s+isConnected\s*=\s*true\b/,
          message: 'Header 连接状态被写死为 true',
          hint: '请改为从 gateway store / get_status 获取状态'
        }
      ]
    },
    {
      file: 'src/components/layout/Sidebar.tsx',
      forbidden: [
        {
          re: /console\.log\(\s*['"]Open settings['"]\s*\)/,
          message: 'Sidebar 的 Settings 入口仍是占位 console.log',
          hint: '请调用 openSettings(...) 打开设置弹窗'
        },
        {
          re: /TODO:\s*打开设置/,
          message: 'Sidebar 的 Settings 入口仍标注为 TODO',
          hint: '请实现打开设置弹窗的真实逻辑'
        }
      ]
    },
    {
      file: 'src/lib/api.ts',
      forbidden: [
        {
          re: /Tauri backend not implemented yet/i,
          message: 'api.ts 仍包含未实现后端的占位错误',
          hint: '发布版应使用真实 tauri invoke'
        },
        {
          re: /Mock invoke function/i,
          message: 'api.ts 仍包含 mock invoke 的注释/实现',
          hint: '请确保 release 路径不再依赖 mock invoke'
        }
      ]
    }
  ]

  const issues = []
  for (const check of checks) {
    issues.push(...checkFile(check.file, check.forbidden))
  }

  if (issues.length > 0) {
    console.error('❌ release-gate failed:\n')
    for (const issue of issues) {
      console.error(`- ${issue.file}: ${issue.message}`)
      console.error(`  hint: ${issue.hint}`)
    }
    console.error(`\nFound ${issues.length} issue(s).`)
    process.exit(1)
  }

  console.log('✅ release-gate passed')
}

main()

