#!/usr/bin/env node
/**
 * ClawStation 分层架构 Linter
 * 基于 OpenAI "Harness Engineering" 原则
 * 
 * 功能：
 * 1. 检查分层依赖是否违规
 * 2. 错误消息包含修复指令
 * 3. 可被代理自动修复
 */

const fs = require('fs');
const path = require('path');

// 分层规则定义
const LAYERS = {
  types: { level: 0, allowed: [] },
  config: { level: 1, allowed: ['types'] },
  service: { level: 2, allowed: ['types', 'config'] },
  store: { level: 3, allowed: ['types', 'service'] },
  ui: { level: 4, allowed: ['types', 'store'] },
};

// 文件到层的映射
const FILE_TO_LAYER = {
  'src/types/': 'types',
  'src/lib/': 'service',
  'src/stores/': 'store',
  'src/components/': 'ui',
};

// 检查单个文件
function checkFile(filePath, content) {
  const issues = [];
  
  // 确定文件所在层
  let fileLayer = null;
  for (const [prefix, layer] of Object.entries(FILE_TO_LAYER)) {
    if (filePath.startsWith(prefix)) {
      fileLayer = layer;
      break;
    }
  }
  
  if (!fileLayer) return issues;
  
  // 检查 import 语句
  const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // 确定导入的层
    let importLayer = null;
    for (const [prefix, layer] of Object.entries(FILE_TO_LAYER)) {
      if (importPath.startsWith('.')) {
        // 相对路径，解析绝对路径
        const absPath = path.resolve(path.dirname(filePath), importPath);
        if (absPath.startsWith(prefix)) {
          importLayer = layer;
          break;
        }
      } else if (importPath.startsWith(prefix)) {
        importLayer = layer;
        break;
      }
    }
    
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
