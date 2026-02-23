import React from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { MessageList } from './MessageList';
import { CanvasPanel } from '../canvas/CanvasPanel';
import { FileBrowser } from '../files/FileBrowser';

type PanelType = 'chat' | 'canvas' | 'files';

/**
 * ChatPanel - 聊天主面板
 * 
 * 根据当前会话类型显示不同的内容:
 * - chat: 显示消息列表
 * - canvas: 显示 Canvas 面板
 * - files: 显示文件浏览器
 */
export const ChatPanel: React.FC = () => {
  const { activeSessionKey, sessions } = useSessionStore();
  
  // 根据会话 key 判断面板类型 (mock 逻辑)
  const getPanelType = (sessionKey: string | null): PanelType => {
    if (!sessionKey) return 'chat';
    if (sessionKey.includes('canvas')) return 'canvas';
    if (sessionKey.includes('files')) return 'files';
    return 'chat';
  };
  
  const panelType = getPanelType(activeSessionKey);
  const activeSession = sessions.find(s => s.key === activeSessionKey);

  // 渲染对应的面板内容
  const renderContent = () => {
    switch (panelType) {
      case 'canvas':
        return <CanvasPanel />;
      case 'files':
        return <FileBrowser />;
      case 'chat':
      default:
        return <MessageList />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-primary)]">
      {/* 会话标题 */}
      {activeSession && (
        <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
                {activeSession.displayName}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {activeSession.model} • {activeSession.totalTokens.toLocaleString()} tokens
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`
                px-2 py-0.5 text-xs rounded-full
                ${activeSession.kind === 'main' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                }
              `}>
                {activeSession.kind}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* 面板内容 */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};
