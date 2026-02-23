import React from 'react';
import { User, Bot, Wrench, AlertCircle } from 'lucide-react';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}

/**
 * MessageItem - 单条消息组件
 * 
 * 显示一条消息，包括头像、角色标识和内容
 */
export const MessageItem: React.FC<MessageItemProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user';
  const isTool = message.role === 'toolResult';

  return (
    <div 
      className={`
        flex gap-3 py-3 px-4 rounded-lg
        ${isUser ? 'bg-sky-50 dark:bg-sky-900/20' : 'bg-transparent'}
        ${isStreaming ? 'opacity-80' : ''}
      `}
    >
      {/* 头像 */}
      <div className="flex-shrink-0">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center
          ${isUser 
            ? 'bg-sky-500 text-white' 
            : isTool
              ? 'bg-amber-500 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }
        `}
        >
          {isUser ? <User className="w-4 h-4" /> 
            : isTool 
              ? <Wrench className="w-4 h-4" />
              : <Bot className="w-4 h-4" />
          }
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {/* 角色标签 */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {isUser ? 'You' : isTool ? 'Tool' : 'Assistant'}
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {formatTime(message.timestamp)}
          </span>
          {isStreaming && (
            <span className="text-xs text-sky-500 animate-pulse">
              typing...
            </span>
          )}
        </div>

        {/* 消息内容 */}
        <div className="space-y-2">
          {message.content.map((part, index) => (
            <ContentPart key={index} part={part} />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 内容片段渲染
 */
interface ContentPartProps {
  part: Message['content'][number];
}

const ContentPart: React.FC<ContentPartProps> = ({ part }) => {
  switch (part.type) {
    case 'text':
      return (
        <div className="text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
          {part.text}
        </div>
      );
    
    case 'image':
      return (
        <div className="max-w-md">
          <img 
            src={part.image} 
            alt="Attached image" 
            className="rounded-lg border border-[var(--color-border)] max-h-64 object-contain"
          />
        </div>
      );
    
    case 'toolCall':
      return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-2">
            <Wrench className="w-4 h-4" />
            <span className="text-sm font-medium">Tool Call: {part.name}</span>
          </div>
          <pre className="text-xs text-[var(--color-text-secondary)] overflow-x-auto">
            {JSON.stringify(part.arguments, null, 2)}
          </pre>
        </div>
      );
    
    case 'toolResult':
      return (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Tool Result: {part.toolName}</span>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            {part.content.map((c, i) => (
              c.type === 'text' ? <span key={i}>{c.text}</span> : null
            ))}
          </div>
        </div>
      );
    
    default:
      return null;
  }
};

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
