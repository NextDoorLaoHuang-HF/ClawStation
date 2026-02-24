#!/usr/bin/env node
/**
 * Docs/metadata consistency checks.
 *
 * Goals:
 * - Keep the repo "knowledge base" trustworthy: referenced files and npm scripts must exist.
 * - Stay lightweight: only validate high-signal references (docs/*.md, scripts/*.{sh,js,cjs,mjs}).
 */

import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8')
}

function exists(relPath) {
  return fs.existsSync(path.join(REPO_ROOT, relPath))
}

function listDocsMarkdown() {
  const docsDir = path.join(REPO_ROOT, 'docs')
  if (!fs.existsSync(docsDir)) return []
  return fs
    .readdirSync(docsDir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.posix.join('docs', name))
}

function unique(arr) {
  return [...new Set(arr)]
}

function main() {
  const issues = []

  const pkg = JSON.parse(readText('package.json'))
  const npmScripts = pkg.scripts ?? {}

  // Keep this list small and high-signal.
  const requiredFiles = [
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'AGENTS.md',
    'FLAKY_TESTS.md',
    'docs/API.md',
    'docs/ARCHITECTURE.md',
    'docs/DEPLOYMENT.md',
    'docs/CONTRIBUTING.md',
    'docs/DEVELOPMENT.md',
    'docs/PLUGINS.md',
    'docs/QUALITY.md',
    'docs/QUALITY-IMPROVEMENT.md',
    'docs/ROADMAP.md',
    'docs/USER_GUIDE.md',
    'docs/WORKFLOW.md',
  ]

  for (const rel of requiredFiles) {
    if (!exists(rel)) issues.push(`[missing file] ${rel}`)
  }

  const scanFiles = unique([
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'AGENTS.md',
    ...listDocsMarkdown(),
  ]).filter((p) => exists(p))

  const npmRunRe = /\bnpm run ([a-zA-Z0-9:_-]+)\b/g
  const npmTestRe = /\bnpm test\b/
  const fileRefRe =
    /(?:^|[\s(`])((?:\.\/)?(?:docs|scripts)\/[A-Za-z0-9._/-]+\.(?:md|sh|js|cjs|mjs))(?:$|[)\s`.,])/gm

  for (const relPath of scanFiles) {
    const content = readText(relPath)

    // Validate `npm run <script>`
    for (const match of content.matchAll(npmRunRe)) {
      const script = match[1]
      if (!npmScripts[script]) {
        issues.push(`[missing npm script] ${relPath}: npm run ${script}`)
      }
    }

    // Validate `npm test` maps to scripts.test
    if (npmTestRe.test(content) && !npmScripts.test) {
      issues.push(`[missing npm script] ${relPath}: npm test (expects scripts.test)`)
    }

    // Validate referenced docs/scripts paths exist.
    for (const match of content.matchAll(fileRefRe)) {
      const rawRef = match[1]
      const normalized = rawRef.startsWith('./') ? rawRef.slice(2) : rawRef
      if (!exists(normalized)) {
        issues.push(`[missing path] ${relPath}: ${rawRef}`)
      }
    }
  }

  if (issues.length > 0) {
    console.error('❌ doc-check failed:\n')
    for (const issue of issues) console.error(`- ${issue}`)
    console.error(`\nFound ${issues.length} issue(s).`)
    process.exit(1)
  }

  console.log('✅ doc-check passed')
}

main()
