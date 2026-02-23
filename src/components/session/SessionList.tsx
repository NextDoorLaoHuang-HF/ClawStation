import React from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { MessageSquare, X, MoreHorizontal } from 'lucide-react';

/**
 * SessionList - 会话列表组件
 * 
 * 显示当前 Agent 的所有会话，支持切换和关闭
 */
export const SessionList: React.FC = () => {
  const { sessions, activeSessionKey, setActiveSession, loadSessions } = useSessionStore();

  // 按更新时间排序
  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="w-64 h-full bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col">
      {/* 标题 */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--color-border)]">
        <span className="font-medium text-[var(--color-text-primary)]">Sessions</span>
        <button
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          onClick={() => loadSessions()}
          title="Refresh"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto claw-scrollbar py-2">
        {sortedSessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm text-[var(--color-text-muted)]">No sessions yet</p>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {sortedSessions.map((session) => (
              <SessionItem
                key={session.key}
                session={session}
                isActive={session.key === activeSessionKey}
                onClick={() => setActiveSession(session.key)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 会话列表项
 */
interface SessionItemProps {
  session: {
    key: string;
    displayName: string;
    kind: string;
    updatedAt: number;
    totalTokens: number;
  };
  isActive: boolean;
  onClick: () => void;
}

const SessionItem: React.FC<SessionItemProps> = ({ session, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group
        ${isActive 
          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' 
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{session.displayName}</div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span className={`
            px-1.5 py-0.5 rounded text-[10px]
            ${session.kind === 'main' 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
            }
          `}>
            {session.kind}
          </span>
          <span>{formatTime(session.updatedAt)}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1 rounded hover:bg-[var(--color-border)]"
          onClick={(e) => {
            e.stopPropagation();
            console.log('More options:', session.key);
          }}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Close session:', session.key);
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </button>
  );
};

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  // 小于 1 分钟
  if (diff < 60000) {
    return 'Just now';
  }
  
  // 小于 1 小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // 小于 24 小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // 大于 24 小时
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
