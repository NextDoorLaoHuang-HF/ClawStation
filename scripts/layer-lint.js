#!/usr/bin/env node
/**
 * ClawStation 分层架构 Linter
 *
 * Notes:
 * - This repo uses ESM ("type": "module"), so this script must be ESM too.
 * - Prefer running from repo root: `node scripts/layer-lint.js`.
 */

import fs from 'node:fs'
import path from 'node:path'

// 分层规则定义
const LAYERS = {
  // Allow same-layer imports; enforce that lower layers never depend on higher layers.
  types: { level: 0, allowed: ['types'] },
  config: { level: 1, allowed: ['types', 'config'] },
  service: { level: 2, allowed: ['types', 'config', 'service'] },
  store: { level: 3, allowed: ['types', 'config', 'service', 'store'] },
  ui: { level: 4, allowed: ['types', 'config', 'service', 'store', 'ui'] },
};

// 文件到层的映射
const FILE_TO_LAYER = {
  'src/types/': 'types',
  'src/lib/': 'service',
  'src/plugins/': 'service',
  'src/stores/': 'store',
  'src/components/': 'ui',
};

const REPO_ROOT = process.cwd()

function isWithin(absPath, absDir) {
  const rel = path.relative(absDir, absPath)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

function layerForFile(absFilePath) {
  for (const [relPrefix, layer] of Object.entries(FILE_TO_LAYER)) {
    const absPrefix = path.resolve(REPO_ROOT, relPrefix)
    if (isWithin(absFilePath, absPrefix)) return layer
  }
  return null
}

function layerForImport(absImportPath) {
  for (const [relPrefix, layer] of Object.entries(FILE_TO_LAYER)) {
    const absPrefix = path.resolve(REPO_ROOT, relPrefix)
    if (isWithin(absImportPath, absPrefix)) return layer
  }
  return null
}

// 检查单个文件
function checkFile(filePath, content) {
  const issues = [];
  
  // 确定文件所在层
  const absFilePath = path.resolve(REPO_ROOT, filePath)
  const fileLayer = layerForFile(absFilePath)
  
  if (!fileLayer) return issues;
  
  // 检查 import / re-export 语句
  const moduleRefRegex = /(import|export)\s+.*from\s+['"]([^'"]+)['"]/g
  let match
  
  while ((match = moduleRefRegex.exec(content)) !== null) {
    const importPath = match[2]
    
    // 确定导入的层
    let absImportPath = null
    if (importPath.startsWith('.')) {
      absImportPath = path.resolve(path.dirname(absFilePath), importPath)
    } else if (importPath.startsWith('src/')) {
      absImportPath = path.resolve(REPO_ROOT, importPath)
    }
    
    const importLayer = absImportPath ? layerForImport(absImportPath) : null

    if (importLayer && !LAYERS[fileLayer].allowed.includes(importLayer)) {
      issues.push({
        file: filePath,
        line: content.substring(0, match.index).split('\n').length,
        message: `分层违规：${fileLayer} 层不能导入 ${importLayer} 层`,
        import: match[0],
        fix: `将 ${importLayer} 层的依赖移到 ${LAYERS[fileLayer].allowed.join(' 或 ')} 层`,
      });
    }
  }
  
  return issues;
}

// 检查所有文件
function lint(srcDir) {
  const allIssues = [];
  
  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walk(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const issues = checkFile(filePath, content);
        allIssues.push(...issues);
      }
    }
  }
  
  walk(srcDir);
  return allIssues;
}

// 主函数
function main() {
  const srcDir = process.argv[2] || './src';
  
  console.log('🔍 ClawStation 分层架构检查\n');
  console.log(`检查目录: ${srcDir}\n`);
  
  const issues = lint(srcDir);
  
  if (issues.length === 0) {
    console.log('✅ 未发现分层违规\n');
    process.exit(0);
  }
  
  console.log(`❌ 发现 ${issues.length} 个分层违规:\n`);
  
  for (const issue of issues) {
    console.log(`📁 ${issue.file}:${issue.line}`);
    console.log(`   错误: ${issue.message}`);
    console.log(`   导入: ${issue.import}`);
    console.log(`   修复: ${issue.fix}\n`);
  }
  
  process.exit(1);
}

main();
