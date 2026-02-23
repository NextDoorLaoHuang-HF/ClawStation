import React, { useState, useEffect, useCallback } from 'react';
import { Folder, FileText, RefreshCw, ChevronRight, ChevronDown, Home, X, Image } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAgentStore } from '../../stores/agentStore';
import type { FileInfo } from '../../types';

/**
 * FileBrowser - 文件浏览器组件
 * 
 * 浏览 Agent 工作空间的文件和目录
 */
export const FileBrowser: React.FC = () => {
  const currentAgentId = useAgentStore((state) => state.currentAgentId);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始加载
  useEffect(() => {
    loadDirectory('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAgentId]);

  // 加载目录内容
  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // 调用 Tauri API
      const result = await invoke<Array<{
        name: string;
        path: string;
        is_dir: boolean;
        size?: number;
        modified?: number;
        mime_type?: string;
      }>>('list_workspace', { agentId: currentAgentId, path });
      
      // 转换为前端类型 (camelCase)
      const fileList: FileInfo[] = result.map((f) => ({
        name: f.name,
        path: f.path,
        isDir: f.is_dir,
        size: f.size,
        modified: f.modified,
        mimeType: f.mime_type,
      }));
      
      setFiles(fileList);
      setCurrentPath(path);
    } catch (err) {
      console.error('Failed to load directory:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentAgentId]);

  // 处理文件/目录点击
  const handleItemClick = async (file: FileInfo) => {
    if (file.isDir) {
      setSelectedFile(null);
      setPreviewContent(null);
      setPreviewImage(null);
      loadDirectory(file.path);
    } else {
      setSelectedFile(file);
      await loadFilePreview(file);
    }
  };

  // 加载文件预览
  const loadFilePreview = async (file: FileInfo) => {
    setIsPreviewLoading(true);
    setPreviewContent(null);
    setPreviewImage(null);
    
    try {
      // 检查是否为图片文件
      const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (ext && imageExtensions.includes(ext)) {
        // 读取图片
        const result = await invoke<{
          data: number[];
          width: number;
          height: number;
          mimeType: string;
        }>('read_image', { agentId: currentAgentId, path: file.path });
        
        // 转换为 base64
        const byteArray = new Uint8Array(result.data);
        const base64 = btoa(String.fromCharCode.apply(null, Array.from(byteArray)));
        setPreviewImage({
          data: base64,
          mimeType: result.mimeType,
        });
      } else {
        // 读取文本文件
        const content = await invoke<string>('read_file', {
          agentId: currentAgentId,
          path: file.path,
          offset: 0,
          limit: 1000, // 限制预览行数
        });
        setPreviewContent(content);
      }
    } catch (err) {
      console.error('Failed to load file preview:', err);
      setPreviewContent(`Error loading preview: ${err}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 关闭预览
  const closePreview = () => {
    setSelectedFile(null);
    setPreviewContent(null);
    setPreviewImage(null);
  };

  // 返回上级目录
  const handleGoUp = () => {
    if (!currentPath) return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    loadDirectory(parentPath);
  };

  // 路径面包屑
  const pathParts = currentPath ? currentPath.split('/') : [];

  // 判断是否为图片类型
  const isImageFile = (file: FileInfo) => {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ext && imageExtensions.includes(ext);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-primary)]">
      {/* 工具栏 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-1 text-sm overflow-hidden">
          <button
            onClick={() => loadDirectory('')}
            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex-shrink-0"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </button>
          
          {pathParts.map((part, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
              <button
                onClick={() => loadDirectory(pathParts.slice(0, index + 1).join('/'))}
                className="px-1.5 py-0.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] truncate max-w-[100px]"
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
          className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50 flex-shrink-0"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 主内容区：文件列表 + 预览 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 文件列表 */}
        <div className={`${selectedFile ? 'w-1/2' : 'w-full'} border-r border-[var(--color-border)] overflow-y-auto claw-scrollbar`}>
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
              ) : isImageFile(file) ? (
                <Image className="w-5 h-5 text-purple-400 flex-shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
              
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm text-[var(--color-text-primary)] truncate">{file.name}</div>
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

        {/* 预览面板 */}
        {selectedFile && (
          <div className="w-1/2 flex flex-col bg-[var(--color-bg-secondary)]">
            {/* 预览头部 */}
            <div className="h-10 flex items-center justify-between px-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-sm">
                {isImageFile(selectedFile) ? (
                  <Image className="w-4 h-4 text-purple-400" />
                ) : (
                  <FileText className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-[var(--color-text-primary)] truncate">{selectedFile.name}</span>
              </div>
              <button
                onClick={closePreview}
                className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                title="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* 预览内容 */}
            <div className="flex-1 overflow-auto claw-scrollbar p-4">
              {isPreviewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
                </div>
              ) : previewImage ? (
                <div className="flex items-center justify-center">
                  <img
                    src={`data:${previewImage.mimeType};base64,${previewImage.data}`}
                    alt={selectedFile.name}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              ) : previewContent !== null ? (
                <pre className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono bg-[var(--color-bg-primary)] p-3 rounded overflow-x-auto">
                  {previewContent}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
                  No preview available
                </div>
              )}
            </div>
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
