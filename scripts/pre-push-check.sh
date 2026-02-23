#!/bin/bash
# ClawStation 预提交检查脚本
# 在推送前运行完整验证，确保 CI 不会失败

set -e

echo "🔍 ClawStation 预提交检查"
echo "=========================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# 检查前端代码
echo ""
echo "📦 前端检查"
echo "------------"

# TypeScript 类型检查
echo "  🔍 TypeScript 类型检查..."
if npm run type-check 2>/dev/null; then
    echo "  ${GREEN}✓${NC} 类型检查通过"
else
    echo "  ${RED}✗${NC} 类型检查失败"
    FAILED=1
fi

# ESLint 检查
echo "  🔍 ESLint 检查..."
if npm run lint 2>/dev/null; then
    echo "  ${GREEN}✓${NC} ESLint 通过"
else
    echo "  ${RED}✗${NC} ESLint 失败"
    FAILED=1
fi

# 前端测试
echo "  🔍 前端测试..."
if npm test 2>/dev/null; then
    echo "  ${GREEN}✓${NC} 前端测试通过"
else
    echo "  ${RED}✗${NC} 前端测试失败"
    FAILED=1
fi

# 检查后端代码
echo ""
echo "⚙️  后端检查 (Rust)"
echo "-------------------"

cd src-tauri

# 格式化检查
echo "  🔍 Rust 格式化检查..."
if cargo fmt -- --check 2>/dev/null; then
    echo "  ${GREEN}✓${NC} 格式化检查通过"
else
    echo "  ${RED}✗${NC} 格式化检查失败"
    echo "     运行 'cargo fmt' 修复"
    FAILED=1
fi

# Clippy 检查
echo "  🔍 Clippy 检查..."
if cargo clippy --all-targets -- -D warnings 2>/dev/null; then
    echo "  ${GREEN}✓${NC} Clippy 检查通过"
else
    echo "  ${RED}✗${NC} Clippy 检查失败"
    FAILED=1
fi

# Rust 测试
echo "  🔍 Rust 测试..."
if cargo test 2>/dev/null; then
    echo "  ${GREEN}✓${NC} Rust 测试通过"
else
    echo "  ${RED}✗${NC} Rust 测试失败"
    FAILED=1
fi

cd ..

# 总结
echo ""
echo "=========================="
if [ $FAILED -eq 0 ]; then
    echo "${GREEN}✅ 所有检查通过！可以安全推送。${NC}"
    echo ""
    echo "推送命令:"
    echo "  git push origin main"
    exit 0
else
    echo "${RED}❌ 检查失败，请修复后再推送。${NC}"
    echo ""
    echo "常见修复:"
    echo "  npm run format    # 格式化前端代码"
    echo "  cargo fmt         # 格式化 Rust 代码"
    exit 1
fi
