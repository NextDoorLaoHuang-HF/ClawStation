import React from 'react';
import { Plus, X, MessageSquare, Image as ImageIcon, Folder } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';
import { useAgentStore } from '../../stores/agentStore';

/**
 * SessionTabs - 会话标签页组件
 * 
 * 显示打开的标签页，支持切换、关闭和新建会话
 */
export const SessionTabs: React.FC = () => {
  const { 
    sessions, 
    activeSessionKey, 
    setActiveSession, 
    createSession 
  } = useSessionStore();
  const { currentAgentId } = useAgentStore();

  // 获取会话图标
  const getSessionIcon = (kind: string) => {
    switch (kind) {
      case 'canvas':
        return <ImageIcon className="w-3.5 h-3.5" />;
      case 'files':
        return <Folder className="w-3.5 h-3.5" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5" />;
    }
  };

  // 处理新建会话
  const handleNewSession = async () => {
    try {
      await createSession(currentAgentId);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <div className="h-10 flex items-center bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-2 gap-1">
      {/* 标签页列表 */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto claw-scrollbar">
        {sessions.map((session) => (
          <TabItem
            key={session.key}
            session={session}
            isActive={session.key === activeSessionKey}
            icon={getSessionIcon(session.kind)}
            onClick={() => setActiveSession(session.key)}
            onClose={() => console.log('Close tab:', session.key)}
          />
        ))}
      </div>

      {/* 新建会话按钮 */}
      <button
        onClick={handleNewSession}
        className="
          flex-shrink-0 p-1.5 rounded-md 
          text-[var(--color-text-muted)] 
          hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]
          transition-colors
        "
        title="New session"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * 单个标签页
 */
interface TabItemProps {
  session: {
    key: string;
    displayName: string;
    kind: string;
  };
  isActive: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  onClose: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ 
  session, 
  isActive, 
  icon, 
  onClick, 
  onClose 
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        group flex items-center gap-2 px-3 py-1.5 rounded-md 
        cursor-pointer transition-all select-none
        max-w-[160px] min-w-[80px]
        ${isActive 
          ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm' 
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      {/* 图标 */}
      <span className="flex-shrink-0">{icon}</span>
      
      {/* 标题 */}
      <span className="flex-1 text-sm truncate">{session.displayName}</span>
      
      {/* 关闭按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`
          flex-shrink-0 p-0.5 rounded 
          opacity-0 group-hover:opacity-100 
          hover:bg-[var(--color-border)]
          transition-all
          ${isActive ? 'opacity-100' : ''}
        `}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
