import React, { useRef, useEffect, useMemo } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { MessageItem } from './MessageItem';
import { Loader2 } from 'lucide-react';

/**
 * MessageList - 消息列表组件
 * 
 * 显示当前会话的所有消息，支持自动滚动到底部
 */
export const MessageList: React.FC = () => {
  const { activeSessionKey, messages, isLoading, streamingMessage, error, clearError } = useSessionStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMessages = useMemo(() => 
    activeSessionKey ? messages[activeSessionKey] || [] : [],
    [activeSessionKey, messages]
  );

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages, streamingMessage]);

  // 空状态
  if (currentMessages.length === 0 && !streamingMessage) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          {error && (
            <div className="mb-4 max-w-md rounded-lg bg-red-50 p-3 text-left text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 break-words">{error}</div>
                <button
                  type="button"
                  onClick={clearError}
                  className="flex-shrink-0 text-xs text-red-700 hover:underline dark:text-red-300"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className="text-4xl mb-4">👋</div>
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
            Start a conversation
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-sm">
            Send a message to start chatting with the AI assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="h-full overflow-y-auto claw-scrollbar p-4 space-y-4"
    >
      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 break-words">{error}</div>
            <button
              type="button"
              onClick={clearError}
              className="flex-shrink-0 text-xs text-red-700 hover:underline dark:text-red-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      {currentMessages.map((message, index) => (
        <MessageItem 
          key={`${message.timestamp}-${index}`} 
          message={message} 
        />
      ))}
      
      {/* 流式消息 */}
      {streamingMessage && (
        <MessageItem 
          message={{
            role: 'assistant',
            content: [{ type: 'text', text: streamingMessage }],
            timestamp: 0,
          }}
          isStreaming={true}
        />
      )}
      
      {/* 加载指示器 */}
      {isLoading && !streamingMessage && (
        <div className="flex items-center gap-2 text-[var(--color-text-muted)] py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      )}
    </div>
  );
};
