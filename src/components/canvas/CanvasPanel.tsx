import React, { useState, useRef } from 'react';
import { 
  RefreshCw, 
  ExternalLink, 
  Camera, 
  Code, 
  Maximize2, 
  Minimize2,
  Globe,
  Layout
} from 'lucide-react';

/**
 * CanvasPanel - Canvas 面板组件
 * 
 * WebView 容器，用于显示 Canvas、A2UI 或外部网页
 */
export const CanvasPanel: React.FC = () => {
  const [url, setUrl] = useState('http://localhost:18793/__openclaw__/canvas/');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 刷新页面
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      // eslint-disable-next-line no-self-assign
      iframeRef.current.src = iframeRef.current.src;
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  // 导航到 URL
  const handleNavigate = (newUrl: string) => {
    setUrl(newUrl);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  // 执行 JavaScript
  const handleEval = () => {
    // TODO: 调用 Tauri API 执行 JS
    console.log('Eval JavaScript in canvas');
  };

  // 截图
  const handleSnapshot = () => {
    // TODO: 调用 Tauri API 截图
    console.log('Take canvas snapshot');
  };

  return (
    <div className={`flex flex-col bg-[var(--color-bg-primary)] ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* 工具栏 */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {/* 左侧 - 地址栏 */}
        <div className="flex-1 flex items-center gap-2 mr-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)] flex-1 max-w-xl">
            <Globe className="w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNavigate(url);
                }
              }}
              className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
              placeholder="Enter URL..."
            />
          </div>
          
          <button
            onClick={() => handleNavigate(url)}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* 右侧 - 工具按钮 */}
        <div className="flex items-center gap-1">
          <ToolbarButton 
            icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />} 
            onClick={handleRefresh}
            title="Refresh"
          />
          <ToolbarButton 
            icon={<Code className="w-4 h-4" />} 
            onClick={handleEval}
            title="Execute JavaScript"
          />
          <ToolbarButton 
            icon={<Camera className="w-4 h-4" />} 
            onClick={handleSnapshot}
            title="Take snapshot"
          />
          <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
          
          <ToolbarButton 
            icon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />} 
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          />
        </div>
      </div>

      {/* WebView 容器 */}
      <div className="flex-1 relative bg-white">
        {/* 加载指示器 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-primary)] z-10">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
              <span className="text-sm text-[var(--color-text-muted)]">Loading...</span>
            </div>
          </div>
        )}

        {/* iframe */}
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="clipboard-read; clipboard-write"
        />

        {/* 空状态 */}
        {!url && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-primary)]">
            <div className="text-center">
              <Layout className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">Canvas Panel</h3>
              <p className="text-sm text-[var(--color-text-muted)] max-w-sm">
                Enter a URL to load content, or use the default Canvas host.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 工具栏按钮
 */
interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, onClick, title }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
    >
      {icon}
    </button>
  );
};
