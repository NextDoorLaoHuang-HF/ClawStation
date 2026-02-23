import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Image, X } from 'lucide-react';
import { useSessionStore } from '../../stores/sessionStore';

/**
 * InputArea - 输入框组件
 * 
 * 消息输入区域，支持文本输入、文件附件、发送按钮
 */
export const InputArea: React.FC = () => {
  const { activeSessionKey, sendMessage, isLoading } = useSessionStore();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 处理发送消息
  const handleSend = useCallback(async () => {
    if (!activeSessionKey || (!input.trim() && attachments.length === 0) || isLoading) {
      return;
    }

    const content = input.trim();
    setInput('');
    setAttachments([]);
    
    // 调整 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await sendMessage(activeSessionKey, content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [activeSessionKey, input, attachments, isLoading, sendMessage]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // 自动调整 textarea 高度
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInput(target.value);
    
    // 重置高度并计算新高度
    target.style.height = 'auto';
    const newHeight = Math.min(target.scrollHeight, 200); // 最大 200px
    target.style.height = `${newHeight}px`;
  }, []);

  // 移除附件
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 如果没有激活的会话，显示提示
  if (!activeSessionKey) {
    return (
      <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="text-center text-sm text-[var(--color-text-muted)]">
          Select or create a session to start chatting
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment, index) => (
            <div 
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-tertiary)] rounded text-xs text-[var(--color-text-secondary)]"
            >
              <Image className="w-3 h-3" />
              <span className="max-w-[100px] truncate">{attachment}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="p-0.5 hover:bg-[var(--color-border)] rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* 附件按钮 */}
        <button
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0"
          onClick={() => {
            // TODO: 打开文件选择器
            console.log('Attach file');
          }}
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* 输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            disabled={isLoading}
            rows={1}
            className="
              w-full px-3 py-2.5 
              bg-[var(--color-bg-primary)] 
              border border-[var(--color-border)] 
              rounded-lg 
              text-[var(--color-text-primary)] 
              placeholder:text-[var(--color-text-muted)]
              focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500
              resize-none
              min-h-[42px]
              max-h-[200px]
              disabled:opacity-50
            "
            style={{ overflow: 'auto' }}
          />
        </div>

        {/* 发送按钮 */}
        <button
          onClick={handleSend}
          disabled={(!input.trim() && attachments.length === 0) || isLoading}
          className={`
            p-2.5 rounded-lg flex-shrink-0 transition-colors
            ${(input.trim() || attachments.length > 0) && !isLoading
              ? 'bg-sky-500 text-white hover:bg-sky-600' 
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
            }
          `}
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* 提示文字 */}
      <div className="mt-1 text-xs text-[var(--color-text-muted)] text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
};
