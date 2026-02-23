import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import type { FileInfo } from '../../types';

// Mock 文件树数据
const mockFileTree: FileTreeNode[] = [
  {
    ...{ name: 'src', path: 'src', isDir: true },
    children: [
      {
        ...{ name: 'components', path: 'src/components', isDir: true },
        children: [
          { name: 'layout', path: 'src/components/layout', isDir: true, children: [] },
          { name: 'chat', path: 'src/components/chat', isDir: true, children: [] },
        ],
      },
      { name: 'utils', path: 'src/utils', isDir: true, children: [] },
      { name: 'index.ts', path: 'src/index.ts', isDir: false },
    ],
  },
  {
    ...{ name: 'docs', path: 'docs', isDir: true },
    children: [
      { name: 'README.md', path: 'docs/README.md', isDir: false },
    ],
  },
  { name: 'package.json', path: 'package.json', isDir: false },
];

interface FileTreeNode extends FileInfo {
  children?: FileTreeNode[];
}

interface FileTreeProps {
  onSelect?: (file: FileInfo) => void;
  selectedPath?: string;
}

/**
 * FileTree - 文件树组件
 * 
 * 以树形结构显示文件和目录，支持展开/折叠
 */
export const FileTree: React.FC<FileTreeProps> = ({ 
  onSelect, 
  selectedPath 
}) => {
  return (
    <div className="h-full overflow-y-auto claw-scrollbar py-2">
      {mockFileTree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          level={0}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
};

/**
 * 树节点组件
 */
interface TreeNodeProps {
  node: FileTreeNode;
  level: number;
  onSelect?: (file: FileInfo) => void;
  selectedPath?: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  level, 
  onSelect, 
  selectedPath 
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = node.isDir && node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (node.isDir && hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onSelect?.(node);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-1 px-2 py-1.5 text-left
          hover:bg-[var(--color-bg-tertiary)] transition-colors
          ${isSelected ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400' : ''}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* 展开/折叠指示器 */}
        <span className="w-4 h-4 flex items-center justify-center">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </span>

        {/* 图标 */}
        {node.isDir ? (
          <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
        ) : (
          <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}

        {/* 文件名 */}
        <span className={`
          text-sm truncate
          ${isSelected ? 'font-medium' : 'text-[var(--color-text-secondary)]'}
        `}
        >
          {node.name}
        </span>
      </button>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};
