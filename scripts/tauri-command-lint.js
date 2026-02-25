#!/usr/bin/env node
/**
 * Tauri command lint: ensure frontend invoke/tauriInvoke calls reference commands
 * that are registered in the backend `tauri::generate_handler![...]` list.
 *
 * This catches typos / stale command names that only fail at runtime in releases.
 */

import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = process.cwd()

function readText(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8')
}

function walkFiles(absDir) {
  const out = []
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, ent.name)
    if (ent.isDirectory()) {
      out.push(...walkFiles(abs))
    } else {
      out.push(abs)
    }
  }
  return out
}

function extractBackendCommands() {
  const lib = readText('src-tauri/src/lib.rs')
  const match = lib.match(/generate_handler!\[([\s\S]*?)\]\)/m)
  if (!match) {
    throw new Error('Failed to find tauri::generate_handler![...] in src-tauri/src/lib.rs')
  }

  const body = match[1]
    .replace(/\/\/.*$/gm, '') // strip line comments
    .trim()

  const commands = new Set()
  for (const part of body.split(',')) {
    const entry = part.trim()
    if (!entry) continue
    const last = entry.split('::').pop()
    if (last) commands.add(last)
  }
  return commands
}

function extractFrontendInvokes(relPath, content) {
  const results = []
  const re = /\b(?:tauriInvoke|invoke|safeInvoke)\s*(?:<[^>]+>)?\(\s*['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(content))) {
    const cmd = m[1]
    // Ignore internal plugin/event IPC strings (not user-defined commands).
    if (cmd.includes('|')) continue

    const before = content.slice(0, m.index)
    const line = before.split('\n').length
    results.push({ file: relPath, line, cmd })
  }
  return results
}

function main() {
  const backend = extractBackendCommands()

  const srcAbs = path.join(REPO_ROOT, 'src')
  const files = walkFiles(srcAbs)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))

  const unknown = []
  for (const absPath of files) {
    const relPath = path.relative(REPO_ROOT, absPath)
    const content = fs.readFileSync(absPath, 'utf8')
    for (const inv of extractFrontendInvokes(relPath, content)) {
      if (!backend.has(inv.cmd)) {
        unknown.push(inv)
      }
    }
  }

  if (unknown.length > 0) {
    console.error('❌ tauri-command-lint failed:\n')
    for (const u of unknown) {
      console.error(`- ${u.file}:${u.line} invokes unknown command: ${u.cmd}`)
    }
    console.error(`\nFound ${unknown.length} issue(s).`)
    process.exit(1)
  }

  console.log('✅ tauri-command-lint passed')
}

main()

