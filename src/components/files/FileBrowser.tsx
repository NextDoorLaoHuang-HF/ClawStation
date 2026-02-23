import React, { useState } from 'react';
import { Folder, File, RefreshCw, ChevronRight, ChevronDown, Home } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import type { FileInfo } from '../../types';

// Mock 文件数据
const mockFiles: FileInfo[] = [
  { name: 'src', path: 'src', isDir: true },
  { name: 'docs', path: 'docs', isDir: true },
  { name: 'README.md', path: 'README.md', isDir: false, size: 2048, mimeType: 'text/markdown' },
  { name: 'package.json', path: 'package.json', isDir: false, size: 1024, mimeType: 'application/json' },
  { name: 'tsconfig.json', path: 'tsconfig.json', isDir: false, size: 512, mimeType: 'application/json' },
];

/**
 * FileBrowser - 文件浏览器组件
 * 
 * 浏览 Agent 工作空间的文件和目录
 */
export const FileBrowser: React.FC = () => {
  useAgentStore(); // 保留 hook 调用以维持响应性
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileInfo[]>(mockFiles);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);

  // 加载目录内容
  const loadDirectory = async (path: string) => {
    setIsLoading(true);
    try {
      // TODO: 调用 Tauri API
      // const files = await invoke('list_workspace', { agentId: currentAgentId, path });
      
      // Mock 延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock 数据 - 根据路径返回不同内容
      if (path === 'src') {
        setFiles([
          { name: 'components', path: 'src/components', isDir: true },
          { name: 'utils', path: 'src/utils', isDir: true },
          { name: 'index.ts', path: 'src/index.ts', isDir: false, size: 256, mimeType: 'text/typescript' },
          { name: 'App.tsx', path: 'src/App.tsx', isDir: false, size: 1024, mimeType: 'text/typescript' },
        ]);
      } else if (path === 'docs') {
        setFiles([
          { name: 'api.md', path: 'docs/api.md', isDir: false, size: 5120, mimeType: 'text/markdown' },
          { name: 'guide.md', path: 'docs/guide.md', isDir: false, size: 3072, mimeType: 'text/markdown' },
        ]);
      } else if (path === '') {
        setFiles(mockFiles);
      } else {
        setFiles([]);
      }
      
      setCurrentPath(path);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文件/目录点击
  const handleItemClick = (file: FileInfo) => {
    if (file.isDir) {
      loadDirectory(file.path);
    } else {
      setSelectedFile(file);
      // TODO: 打开文件预览
      console.log('Open file:', file.path);
    }
  };

  // 返回上级目录
  const handleGoUp = () => {
    if (!currentPath) return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    loadDirectory(parentPath);
  };

  // 路径面包屑
  const pathParts = currentPath ? currentPath.split('/') : [];

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-primary)]">
      {/* 工具栏 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => loadDirectory('')}
            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            <Home className="w-4 h-4" />
          </button>
          
          {pathParts.map((part, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
              <button
                onClick={() => loadDirectory(pathParts.slice(0, index + 1).join('/'))}
                className="px-1.5 py-0.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* 刷新按钮 */}
        <button
          onClick={() => loadDirectory(currentPath)}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto claw-scrollbar">
        {currentPath && (
          <button
            onClick={handleGoUp}
            className="w-full flex items-center gap-3 px-4 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
            <span className="text-sm">..</span>
          </button>
        )}

        {files.map((file) => (
          <button
            key={file.path}
            onClick={() => handleItemClick(file)}
            className={`
              w-full flex items-center gap-3 px-4 py-2 
              hover:bg-[var(--color-bg-secondary)] transition-colors
              ${selectedFile?.path === file.path ? 'bg-sky-50 dark:bg-sky-900/20' : ''}
            `}
          >
            {file.isDir ? (
              <Folder className="w-5 h-5 text-amber-500 flex-shrink-0" />
            ) : (
              <File className="w-5 h-5 text-slate-400 flex-shrink-0" />
            )}
            
            <div className="flex-1 text-left">
              <div className="text-sm text-[var(--color-text-primary)]">{file.name}</div>
              {!file.isDir && file.size && (
                <div className="text-xs text-[var(--color-text-muted)]">
                  {formatFileSize(file.size)}
                </div>
              )}
            </div>
          </button>
        ))}

        {files.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
            <Folder className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Empty directory</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
